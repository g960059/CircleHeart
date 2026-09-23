import type { prepareAuthoredModelSuccessorV1 } from "./prepareAuthoredModelSuccessorV1";

type Plan = Awaited<ReturnType<typeof prepareAuthoredModelSuccessorV1>>;
const literal = (value: unknown) => {
  const json = JSON.stringify(value);
  let index = 0;
  while (json.includes(`$successor_json_${index}$`)) index++;
  const tag = `$successor_json_${index}$`;
  return `${tag}${json}${tag}::jsonb`;
};
const tables = {
  contents: ["experiment_contents", "content_id"], snapshots: ["experiment_snapshots", "snapshot_id"],
  snapshotSources: ["experiment_snapshot_sources", "snapshot_id"], snapshotRetention: ["experiment_snapshot_retention", "snapshot_id"],
  experiments: ["experiments", "experiment_id"], experimentPublications: ["experiment_publications", "experiment_id"],
  articleContents: ["article_contents", "article_content_id"], articles: ["articles", "article_id"],
  articlePublications: ["article_publications", "article_id"], surfaces: ["model_surface_releases", "surface_release_id"],
} as const;
type Table = keyof typeof tables;
const mutable: Table[] = ["experiments", "experimentPublications", "articles", "articlePublications"];
const start = (plan: Plan) => `begin;
-- The top-level statement must start with an existing server-side deadline.
-- SET LOCAL inside DO cannot start a statement_timeout timer retroactively.
do $$ begin
  if current_setting('statement_timeout')::interval <= interval '0' or current_setting('statement_timeout')::interval > interval '2 minutes' then
    raise exception 'successor requires a connection statement_timeout greater than zero and at most 2 minutes';
  end if;
end $$;
set local lock_timeout = '5s';
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('circleheart-active-model-bundle-v1', 0));
-- Administrative, one-off transaction: no ordinary save/publish guard is relaxed.
-- Stop competing saves/publications/GC while checking all preimages and repointing.
lock table ${Object.values(tables).map(([name]) => `studio.${name}`).join(", ")}, studio.article_snapshot_refs, studio.active_model_bundle, studio.model_artifact_bindings, studio.model_release_availability in share row exclusive mode;
create temporary table successor_plan(payload jsonb) on commit drop;
insert into successor_plan values (${literal(plan)});
create or replace function pg_temp.assert_successor_rows(table_name text, key_name text, expected jsonb) returns void language plpgsql as $$
declare item jsonb; actual jsonb; normalized jsonb;
begin
  for item in select value from jsonb_array_elements(expected) loop
    execute format('select to_jsonb(t) from studio.%I t where %I::text = $1', table_name, key_name) into actual using item ->> key_name;
    execute format('select to_jsonb(jsonb_populate_record(null::studio.%I, $1))', table_name) into normalized using item;
    if actual is distinct from normalized then raise exception 'successor preimage conflict in %', table_name using errcode = '40001'; end if;
  end loop;
end $$;
`;
const assertRows = (table: Table, section: "before" | "after") => {
  const [name, key] = tables[table];
  return `select pg_temp.assert_successor_rows('${name}', '${key}', payload -> '${section}' -> '${table}') from successor_plan;\n`;
};
const insertRows = (table: "contents" | "snapshots" | "snapshotSources" | "articleContents", section: "before" | "after", allowExisting = false) => {
  const columns = {
    contents: ["content_id", "model_id", "content", "created_by", "created_at", "surface_series_id"],
    snapshots: ["snapshot_id", "owner_id", "content_id", "created_at", "surface_release_id"],
    snapshotSources: ["snapshot_id", "source_experiment_id", "source_experiment_version"],
    articleContents: ["article_content_id", "owner_id", "locale", "title", "tags", "blocks", "created_at"],
  }[table];
  const [name] = tables[table];
  return `insert into studio.${name} (${columns.join(", ")}) select ${columns.map(c => `r.${c}`).join(", ")} from successor_plan p cross join lateral jsonb_populate_recordset(null::studio.${name}, p.payload -> '${section}' -> '${table}') r${allowExisting ? " on conflict do nothing" : ""};\n`;
};
const repoint = (table: Table, section: "before" | "after", rollback = false) => {
  const [name, key] = tables[table];
  const fields: Record<string, string[]> = { experiments: ["model_id", "current_content_id"],
    experimentPublications: ["current_snapshot_id"], articles: ["current_draft_content_id"], articlePublications: ["current_content_id"] };
  const sets = fields[table]!.map(c => `${c} = r.${c}`);
  if (table === "experiments" || table === "articles") sets.push("version = t.version + 1");
  sets.push(rollback ? "updated_at = now()" : "updated_at = r.updated_at");
  // In rollback, update only rows changed by this plan, not untouched Articles.
  return `update studio.${name} t set ${sets.join(", ")} from successor_plan p cross join lateral jsonb_populate_recordset(null::studio.${name}, p.payload -> '${section}' -> '${table}') r where t.${key} = r.${key}${rollback ? ` and exists (select 1 from jsonb_array_elements(p.payload -> 'after' -> '${table}') a where a ->> '${key}' = r.${key}::text)` : ""};\n`;
};

/** Produces private SQL files for explicit operator execution after release
 * registration. Both directions CAS every changed head/publication preimage; rollback never
 * overwrites edits made after migration and can restore GC'd immutable rows
 * from the external backup. Nothing is sent to a database by this module. */
export function authoredModelSuccessorSqlV1(plan: Plan, artifactRevisionId: string) {
  if (!/^[a-f0-9]{64}$/.test(artifactRevisionId)) throw new Error("Invalid admitted artifact revision");
  const bundleCheck = (rollback: boolean) => `do $$
declare p jsonb; b studio.active_model_bundle%rowtype;
begin
  select payload into p from successor_plan;
  select * into b from studio.active_model_bundle where singleton;
  if b.model_id is distinct from p ->> '${rollback ? "toModelId" : "fromModelId"}' or b.version is distinct from (p #>> '{before,activeBundle,version}')::bigint + ${rollback ? 1 : 0} or b.surface_release_id is distinct from p #>> '{before,activeBundle,surface_release_id}' then
    raise exception 'active bundle preimage conflict' using errcode = '40001';
  end if;
  if not exists(select 1 from studio.model_artifact_bindings r join studio.model_release_availability a using(model_id) where r.model_id = p ->> 'toModelId' and r.artifact_revision_id = '${artifactRevisionId}' and a.stage = 'stable' and a.loadable) then
    raise exception 'successor artifact must be registered, stable and loadable';
  end if;
end $$;\n`;
  const inventoryCheck = (rollback: boolean) => `do $$
declare p jsonb; actual jsonb; expected jsonb;
begin
  select payload into p from successor_plan;
  ${rollback ? "" : `select coalesce(jsonb_agg(experiment_id::text order by experiment_id::text), '[]') into actual from studio.experiments where deleted_at is null and model_id = p ->> 'fromModelId';
  select coalesce(jsonb_agg(value ->> 'experiment_id' order by value ->> 'experiment_id'), '[]') into expected from jsonb_array_elements(p #> '{before,experiments}');
  if actual is distinct from expected then raise exception 'Experiment inventory changed' using errcode = '40001'; end if;
  select coalesce(jsonb_agg(s.snapshot_id::text order by s.snapshot_id::text), '[]') into actual from studio.experiment_snapshots s join studio.experiment_contents c using(content_id) where c.model_id = p ->> 'fromModelId';
  select coalesce(jsonb_agg(value ->> 'snapshot_id' order by value ->> 'snapshot_id'), '[]') into expected from jsonb_array_elements(p #> '{before,snapshots}');
  if actual is distinct from expected then raise exception 'Snapshot inventory changed' using errcode = '40001'; end if;
  select coalesce(jsonb_agg(article_id::text order by article_id::text), '[]') into actual from studio.articles where deleted_at is null;
  select coalesce(jsonb_agg(value ->> 'article_id' order by value ->> 'article_id'), '[]') into expected from jsonb_array_elements(p #> '{before,articles}');
  if actual is distinct from expected then raise exception 'Article inventory changed' using errcode = '40001'; end if;`}
  select coalesce(jsonb_agg(experiment_id::text order by experiment_id::text), '[]') into actual from studio.experiment_publications where experiment_id::text in (select value ->> 'experiment_id' from jsonb_array_elements(p #> '{before,experiments}'));
  select coalesce(jsonb_agg(value ->> 'experiment_id' order by value ->> 'experiment_id'), '[]') into expected from jsonb_array_elements(p #> '{${rollback ? "after" : "before"},experimentPublications}');
  if actual is distinct from expected then raise exception 'Experiment publication inventory changed' using errcode = '40001'; end if;
  select coalesce(jsonb_agg(article_id::text order by article_id::text), '[]') into actual from studio.article_publications where article_id::text in (select value ->> 'article_id' from jsonb_array_elements(p #> '{before,articles}'));
  select coalesce(jsonb_agg(value ->> 'article_id' order by value ->> 'article_id'), '[]') into expected from jsonb_array_elements(p #> '{before,articlePublications}');
  if actual is distinct from expected then raise exception 'Article publication inventory changed' using errcode = '40001'; end if;
end $$;\n`;
  const protect = `-- Keep both immutable Snapshot generations; external backup also preserves old draft-only content.
insert into studio.experiment_snapshot_retention(snapshot_id, retain_until)
select r.snapshot_id, null from successor_plan p cross join lateral jsonb_populate_recordset(null::studio.experiment_snapshots, (p.payload #> '{before,snapshots}') || (p.payload #> '{after,snapshots}')) r
on conflict(snapshot_id) do update set retain_until = null, updated_at = now();\n`;
  const projectRefs = `do $$ declare r studio.article_contents%rowtype; begin
for r in select c.* from successor_plan p cross join lateral jsonb_populate_recordset(null::studio.article_contents, p.payload #> '{after,articleContents}') c loop
perform studio.project_article_snapshot_refs_v1(r.article_content_id, r.owner_id, r.blocks);
end loop; end $$;\n`;
  const activate = (rollback: boolean) => `select result.* from successor_plan p cross join lateral public.set_active_model_bundle_v1(
(p.payload #>> '{before,activeBundle,version}')::bigint + ${rollback ? 1 : 0}, p.payload ->> '${rollback ? "fromModelId" : "toModelId"}', p.payload #>> '{before,activeBundle,surface_release_id}') result;\n`;
  const forward = start(plan) + bundleCheck(false) + inventoryCheck(false)
    + (Object.keys(tables) as Table[]).map(t => assertRows(t, "before")).join("")
    + insertRows("contents", "after") + insertRows("snapshots", "after") + insertRows("snapshotSources", "after")
    + protect + insertRows("articleContents", "after") + projectRefs
    + mutable.map(t => repoint(t, "after")).join("")
    + mutable.map(t => assertRows(t, "after")).join("") + activate(false) + "commit;\n";
  const rollback = start(plan) + bundleCheck(true) + inventoryCheck(true) + mutable.map(t => assertRows(t, "after")).join("")
    + insertRows("contents", "before", true) + insertRows("snapshots", "before", true) + insertRows("snapshotSources", "before", true)
    + insertRows("articleContents", "before", true)
    + `insert into studio.article_snapshot_refs select r.* from successor_plan p cross join lateral jsonb_populate_recordset(null::studio.article_snapshot_refs, p.payload #> '{before,articleSnapshotRefs}') r on conflict do nothing;\n`
    + ["contents", "snapshots", "snapshotSources", "articleContents"].map(t => assertRows(t as Table, "before")).join("")
    + mutable.map(t => repoint(t, "before", true)).join("") + protect + activate(true) + "commit;\n";
  return { forward, rollback };
}

/** The linked CLI uses one prepared SQL statement. PostgreSQL's DO statement
 * supplies the atomic transaction without sending separate BEGIN/COMMIT calls. */
export function authoredSuccessorSingleStatementV1(transaction: string): string {
  if (!transaction.startsWith("begin;\n") || !transaction.endsWith("commit;\n")) throw new Error("Expected a complete successor transaction");
  const body = transaction.slice("begin;\n".length, -"commit;\n".length);
  let index = 0;
  while (body.includes(`$successor_transaction_${index}$`) || body.includes(`$successor_body_${index}$`)) index++;
  const outer = `$successor_transaction_${index}$`, inner = `$successor_body_${index}$`;
  return `do ${outer} begin execute ${inner}${body}${inner}; end ${outer};\n`;
}
