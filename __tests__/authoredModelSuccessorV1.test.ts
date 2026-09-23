import { describe, expect, it, vi } from "vitest";
import { prepareAuthoredModelSuccessorV1, type AuthoredModelBackupV1 } from "@/tools/registry/prepareAuthoredModelSuccessorV1";
import { authoredModelSuccessorSqlV1, authoredSuccessorSingleStatementV1 } from "@/tools/registry/AuthoredModelSuccessorSqlV1";
import { assertAuthoredSuccessorBatchFiniteV1 } from "@/tools/registry/validateAuthoredSuccessorLiveContinuationV1";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function successorBackupFixtureV1(): AuthoredModelBackupV1 {
  const date = "2026-09-16T00:00:00.000Z", owner = "10000000-0000-0000-0000-000000000074";
  const uuid = (n: number) => `74000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  const content = (value: number) => ({ modelId: "model/successor-before", surfaceSeriesId: "surface-series/successor-test",
    scenarios: [{ scenarioId: "scenario/test", label: "Saved state", capture: { fixture: { value }, checkpoint: { acceptedRevision: 3, acceptedTimeSec: 0.006, payload: { value } } } }],
    surface: { graphPanes: [], outputPanes: [], controlPanes: [], note: { text: "Keep authored note" } } });
  const placement = { schemaId: "circleheart-studio-experiment-placement-v2", placementId: "placement/test", snapshotId: uuid(3), titleOverride: null, caption: null,
    briefing: { defaultTitle: "Saved experiment", scenarioScope: { visibleScenarioIds: ["scenario/test"], initialFocusScenarioId: "scenario/test" }, graphs: [], outputs: [], controls: [] } };
  const article = (id: number, text: string) => ({ article_content_id: uuid(id), owner_id: owner, locale: "ja", title: "Article", tags: ["前負荷"],
    blocks: [{ kind: "paragraph", blockId: "text", text }, { kind: "experiment", blockId: "experiment", placement }], content_size_bytes: 0, created_at: date });
  return {
    activeBundle: { singleton: true, model_id: "model/successor-before", surface_release_id: "surface/successor-test", version: 17, updated_at: date },
    contents: [1, 2].map(n => ({ content_id: uuid(n), model_id: "model/successor-before", content: content(n), surface_series_id: "surface-series/successor-test", created_by: owner, created_at: date, content_size_bytes: 0 })),
    experiments: [{ experiment_id: uuid(4), owner_id: owner, title: "Current head", model_id: "model/successor-before", current_content_id: uuid(2), version: 8, created_at: date, updated_at: date, deleted_at: null }],
    experimentPublications: [{ experiment_id: uuid(4), owner_id: owner, current_snapshot_id: uuid(3), public_slug: "successor-experiment", published_title: "Published title", published_version: 7, published_at: date, updated_at: date }],
    snapshots: [{ snapshot_id: uuid(3), content_id: uuid(1), surface_release_id: "surface/successor-test", owner_id: owner, created_at: date }],
    snapshotSources: [{ snapshot_id: uuid(3), source_experiment_id: uuid(4), source_experiment_version: 7 }], snapshotRetention: [{ snapshot_id: uuid(3), retain_until: null, updated_at: date }],
    articleContents: [article(5, "Unpublished changes"), article(6, "Published text")],
    articles: [{ article_id: uuid(7), owner_id: owner, current_draft_content_id: uuid(5), version: 5, deleted_at: null, created_at: date, updated_at: date }],
    articlePublications: [{ article_id: uuid(7), owner_id: owner, current_content_id: uuid(6), public_slug: "successor-article", published_at: date, updated_at: date }],
    articleSnapshotRefs: [5, 6].map(n => ({ article_content_id: uuid(n), block_id: "experiment", placement_id: placement.placementId,
      snapshot_id: uuid(3), ordinal: 1, briefing: placement.briefing, title_override: null, caption: null })),
    surfaces: [{ surface_release_id: "surface/successor-test", surface_series_id: "surface-series/successor-test", predecessor_surface_release_id: null,
      model_family_id: "model/successor-test", display_name: "Successor test", source_commit: "test", registered_at: date,
      manifest: { schemaId: "circleheart-studio-model-surface-release-v1", surfaceReleaseId: "surface/successor-test", surfaceSeriesId: "surface-series/successor-test", predecessorSurfaceReleaseId: null,
        modelFamilyId: "model/successor-test", displayName: "Successor test", exposedExactOutputIds: [], controlCatalog: [], derivedOutputCatalog: [], graphCatalog: [], knobCatalog: [], protocolCatalog: [] } }],
  };
}

describe("explicit authored-state model succession", () => {
  it.skipIf(process.env.CIRCLEHEART_TEST_SUCCESSOR_SQL !== "1")("round-trips the generated transaction on local PostgreSQL and rejects stale rollback", async () => {
    const backup = successorBackupFixtureV1();
    backup.contents[0]!.content.surface.note.text = 'Quotes "double" and \'single\'; newline\npath\\data $successor_json_0$ $successor_body_0$';
    const jsonbText = (value: any): string => value === null || typeof value !== "object" ? JSON.stringify(value)
      : Array.isArray(value) ? `[${value.map(jsonbText).join(", ")}]`
        : `{${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}: ${jsonbText(v)}`).join(", ")}}`;
    for (const row of backup.contents) row.content_size_bytes = Buffer.byteLength(jsonbText(row.content));
    for (const row of backup.articleContents) row.content_size_bytes = Buffer.byteLength(jsonbText(row.blocks) + row.title + row.locale);
    const plan = await prepareAuthoredModelSuccessorV1({ backup, fromModelId: "model/successor-before", toModelId: "model/successor-after", admit: async () => {} });
    const sql = authoredModelSuccessorSqlV1(plan, "a".repeat(64));
    const quote = (value: string) => {
      let n = 0; while (value.includes(`$fixture_${n}$`)) n++;
      return `$fixture_${n}$${value}$fixture_${n}$`;
    };
    const rows = (table: string, data: any[]) => {
      const columns = Object.keys(data[0] ?? {}); if (!columns.length) return "";
      return `insert into studio.${table}(${columns.join(",")}) select ${columns.map(c => `r.${c}`).join(",")} from jsonb_populate_recordset(null::studio.${table}, ${quote(JSON.stringify(data))}::jsonb) r;`;
    };
    const forward = authoredSuccessorSingleStatementV1(sql.forward), rollback = "drop table successor_plan;\n" + authoredSuccessorSingleStatementV1(sql.rollback);
    const owner = backup.experiments[0]!.owner_id;
    const seed = ["begin;", `insert into auth.users(id,aud,role,raw_app_meta_data,raw_user_meta_data,is_anonymous,created_at,updated_at) values('${owner}','authenticated','authenticated','{}','{}',false,now(),now());`,
      ...["before", "after"].map((side, index) => `select public.register_model_release_v2('model/successor-${side}', 'model/successor-test','Test', '{"schemaId":"circleheart-studio-exact-model-kernel-v3","modelId":"model/successor-${side}","modelFamilyId":"model/successor-test"}',repeat('${index ? "a" : "b"}',64),'test/successor-${side}/model.mjs',repeat('${index ? "a" : "b"}',64),'test','{}','analysis/test',null,null); select public.set_model_release_stage_v1('model/successor-${side}','stable');`),
      rows("model_surface_releases", backup.surfaces), "insert into studio.model_surface_release_availability values('surface/successor-test','stable',now());",
      rows("experiment_contents", backup.contents), rows("experiments", backup.experiments), rows("experiment_snapshots", backup.snapshots),
      rows("experiment_snapshot_sources", backup.snapshotSources), rows("experiment_snapshot_retention", backup.snapshotRetention), rows("experiment_publications", backup.experimentPublications),
      rows("article_contents", backup.articleContents), rows("article_snapshot_refs", backup.articleSnapshotRefs), rows("articles", backup.articles), rows("article_publications", backup.articlePublications),
      `insert into studio.active_model_bundle select r.* from jsonb_populate_record(null::studio.active_model_bundle, ${quote(JSON.stringify(backup.activeBundle))}::jsonb) r on conflict(singleton) do update set version=17,model_id='model/successor-before',surface_release_id='surface/successor-test',updated_at=excluded.updated_at;`,
    ].join("\n");
    const extraSnapshotId = "74000000-0000-0000-0000-000000009999";
    const script = seed + `
-- A new unreferenced historical Snapshot must not silently escape migration.
insert into studio.experiment_snapshots(snapshot_id,owner_id,content_id,created_at,surface_release_id)
select '${extraSnapshotId}'::uuid,owner_id,content_id,created_at,surface_release_id from studio.experiment_snapshots where snapshot_id='${backup.snapshots[0]!.snapshot_id}';
do $test$ begin
  begin execute ${quote(forward)}; raise exception 'changed Snapshot inventory was accepted';
  exception when serialization_failure then null; end;
end $test$;
delete from studio.experiment_snapshots where snapshot_id='${extraSnapshotId}';
` + forward + `
do $test$ begin
 if (select source_experiment_version from studio.experiment_snapshot_sources where snapshot_id='${plan.after.snapshots[0]!.snapshot_id}') is distinct from 7::bigint then raise exception 'successor publication provenance failed'; end if;
end $test$;
-- Publication-only changes do not increment the draft head version.
update studio.article_publications set current_content_id='${plan.after.articles[0]!.current_draft_content_id}' where article_id='${backup.articles[0]!.article_id}';
do $test$ begin
  begin execute ${quote(rollback)}; raise exception 'changed public pointer rollback was accepted';
  exception when serialization_failure then null; end;
end $test$;
update studio.article_publications set current_content_id='${plan.after.articlePublications[0]!.current_content_id}' where article_id='${backup.articles[0]!.article_id}';
update studio.experiments set version=version+1 where experiment_id='${backup.experiments[0]!.experiment_id}';
do $test$ begin
  begin execute ${quote(rollback)}; raise exception 'stale rollback was accepted';
  exception when serialization_failure then null; end;
end $test$;
update studio.experiments set version=version-1 where experiment_id='${backup.experiments[0]!.experiment_id}';
-- Exercise recovery after old Article content has been garbage-collected.
delete from studio.article_contents where article_content_id in (${backup.articleContents.map(a => quote(a.article_content_id)).join(",")});
` + rollback + `
do $test$ begin
 if (select model_id from studio.experiments where experiment_id='${backup.experiments[0]!.experiment_id}') <> 'model/successor-before' or
    (select version from studio.experiments where experiment_id='${backup.experiments[0]!.experiment_id}') <> 10 then raise exception 'rollback head failed'; end if;
    if (select current_content_id from studio.article_publications where article_id='${backup.articles[0]!.article_id}') <> '${backup.articlePublications[0]!.current_content_id}'::uuid then raise exception 'rollback published pointer failed'; end if;
 if (select published_title from studio.experiment_publications where experiment_id='${backup.experiments[0]!.experiment_id}') <> 'Published title' or
    (select published_version from studio.experiment_publications where experiment_id='${backup.experiments[0]!.experiment_id}') <> 7 or
    (select source_experiment_version from studio.experiment_snapshot_sources where snapshot_id='${backup.snapshots[0]!.snapshot_id}') is distinct from 7::bigint then raise exception 'rollback publication metadata failed'; end if;
 if (select version from studio.active_model_bundle where singleton) <> 19 then raise exception 'rollback active version failed'; end if;
end $test$;
rollback;`;
    const directory = mkdtempSync(join(tmpdir(), "circleheart-successor-sql-")), path = join(directory, "test.sql");
    writeFileSync(path, script, { mode: 0o600 });
    for (const strings of ["on", "off"]) expect(() => execFileSync("docker", ["exec", "-i", "-e",
      `PGOPTIONS=-c statement_timeout=120000 -c standard_conforming_strings=${strings}`, "supabase_db_circleheart", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: script, maxBuffer: 1024 * 1024, encoding: "utf8" })).not.toThrow();
  }, 90_000);

  it.skipIf(process.env.CIRCLEHEART_TEST_SUCCESSOR_SQL !== "1")("honors the connection deadline during the single DO statement", () => {
    const sql = authoredSuccessorSingleStatementV1("begin;\nselect pg_sleep(0.1);\ncommit;\n");
    let failure: any;
    try {
      execFileSync("docker", ["exec", "-i", "-e", "PGOPTIONS=-c statement_timeout=10", "supabase_db_circleheart", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
        { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) { failure = error; }
    expect(failure?.stderr).toContain("canceling statement due to statement timeout");
  });

  it("preserves historical captures separately from heads and does not publish draft edits", async () => {
    const backup = successorBackupFixtureV1(), original = structuredClone(backup), admit = vi.fn(async () => {});
    const plan = await prepareAuthoredModelSuccessorV1({ backup, fromModelId: "model/successor-before", toModelId: "model/successor-after", admit });
    expect(backup).toEqual(original); expect(admit).toHaveBeenCalledTimes(2);
    for (const [index, row] of plan.after.contents.entries()) expect({ ...row.content, modelId: plan.fromModelId }).toEqual(backup.contents[index]!.content);
    expect(plan.after.snapshots[0]!.content_id).toBe(plan.mapping.contents[backup.contents[0]!.content_id]);
    expect(plan.after.experiments[0]!.current_content_id).toBe(plan.mapping.contents[backup.contents[1]!.content_id]);
    expect(plan.after.articles[0]!.current_draft_content_id).not.toBe(plan.after.articlePublications[0]!.current_content_id);
    expect(plan.after.articleContents.map(c => c.blocks[0].text)).toEqual(["Unpublished changes", "Published text"]);
    expect(plan.after.articleContents.map(c => c.tags)).toEqual([["前負荷"], ["前負荷"]]);
    expect(plan.after.experiments[0]!.version).toBe(9); expect(plan.after.articles[0]!.version).toBe(6);
    const sql = authoredModelSuccessorSqlV1(plan, "a".repeat(64));
    expect(sql.forward).toContain("preimage conflict"); expect(sql.forward).toContain("publication inventory changed");
    expect(sql.forward).toContain("Snapshot inventory changed");
    expect(sql.forward).toContain("connection statement_timeout");
    expect(sql.forward).not.toContain("set local statement_timeout");
    expect(sql.rollback).toContain("version = t.version + 1"); expect(sql.rollback).toContain("on conflict do nothing");
    expect(sql.forward).not.toMatch(/disable trigger|session_replication_role|delete from/i);
  });
  it("rejects matching non-finite continued samples rather than accepting NaN equality", () => {
    const good = { outputIds: ["pressure"], acceptedRevisions: new Float64Array([1]), acceptedTimesSec: new Float64Array([.002]),
      outputStates: new Uint8Array([1]), outputValues: new Float64Array([100]), terminalFrame: { modelId: "model/test", runtimeSessionId: "test", scenarioId: "test",
        inputEpoch: 0, acceptedRevision: 1, acceptedTimeSec: .002, outputs: { pressure: { outputId: "pressure", value: 100, availability: "available" as const, quality: "authoritative-state" as const } } } };
    expect(() => assertAuthoredSuccessorBatchFiniteV1(good)).not.toThrow();
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(() => assertAuthoredSuccessorBatchFiniteV1({ ...good, outputValues: new Float64Array([invalid]) })).toThrow(/finite/);
      expect(() => assertAuthoredSuccessorBatchFiniteV1({ ...good, acceptedTimesSec: new Float64Array([invalid]) })).toThrow(/finite/);
      expect(() => assertAuthoredSuccessorBatchFiniteV1({ ...good, terminalFrame: { ...good.terminalFrame,
        outputs: { pressure: { ...good.terminalFrame.outputs.pressure, value: invalid } } } })).toThrow(/finite/);
    }
  });
  it("fails closed on incompatible admission instead of replacing or settling authored state", async () => {
    const admit = vi.fn(async () => { throw new Error("checkpoint incompatible"); });
    await expect(prepareAuthoredModelSuccessorV1({ backup: successorBackupFixtureV1(), fromModelId: "model/successor-before", toModelId: "model/successor-after", admit })).rejects.toThrow("checkpoint incompatible");
    expect(admit).toHaveBeenCalledOnce();
  });
  it("rejects missing pins, unknown referenced contents and mixed-model scope", async () => {
    for (const mutate of [(b: AuthoredModelBackupV1) => { b.surfaces.length = 0; },
      (b: AuthoredModelBackupV1) => { b.experiments[0]!.current_content_id = "missing"; },
      (b: AuthoredModelBackupV1) => { b.contents[0]!.model_id = "another-model"; }]) {
      const backup = successorBackupFixtureV1(); mutate(backup);
      await expect(prepareAuthoredModelSuccessorV1({ backup, fromModelId: "model/successor-before", toModelId: "model/successor-after", admit: async () => {} })).rejects.toThrow(/rejected/);
    }
  });
});
