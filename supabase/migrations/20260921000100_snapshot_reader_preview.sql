-- Rebuildable reading data stays outside the immutable numerical content ledger.
-- Existing Snapshots remain valid without this optional cache.
alter table studio.experiment_snapshots add column reader_preview jsonb
  check (reader_preview is null or coalesce((
    jsonb_typeof(reader_preview) = 'object'
    and reader_preview ->> 'schemaId' = 'circleheart-experiment-reader-preview-v1'
    and reader_preview ->> 'sourceSha256' ~ '^[a-f0-9]{64}$'
    and reader_preview ->> 'previewSha256' ~ '^[a-f0-9]{64}$'
    -- jsonb::text includes spaces absent from the client's bounded wire JSON.
    and octet_length(reader_preview::text) <= 3000000
  ), false));


-- Preview bytes count against the same anonymous storage budget as content.
CREATE OR REPLACE FUNCTION "studio"."enforce_anonymous_storage_quota_v1"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor uuid;
  row_data jsonb := pg_catalog.to_jsonb(new);
  experiment_content_count bigint;
  article_content_count bigint;
  snapshot_count bigint;
  live_experiment_count bigint;
  live_article_count bigint;
  stored_bytes bigint;
  incoming_bytes bigint := 0;
begin
  if not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return new;
  end if;

  actor := coalesce(
    nullif(row_data ->> 'created_by', '')::uuid,
    nullif(row_data ->> 'owner_id', '')::uuid
  );
  if actor is null then
    raise exception 'Anonymous storage quota row has no owner'
      using errcode = '23502';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'studio:anonymous-storage-quota:' || actor::text,
      0
    )
  );

  select count(*), coalesce(sum(content_size_bytes), 0)
  into experiment_content_count, stored_bytes
  from studio.experiment_contents
  where created_by = actor;
  select count(*), stored_bytes + coalesce(sum(content_size_bytes), 0)
  into article_content_count, stored_bytes
  from studio.article_contents
  where owner_id = actor;
  select count(*), stored_bytes + coalesce(sum(pg_catalog.octet_length(reader_preview::text)), 0)
  into snapshot_count, stored_bytes
  from studio.experiment_snapshots
  where owner_id = actor;
  select count(*) into live_experiment_count
  from studio.experiments
  where owner_id = actor and deleted_at is null;
  select count(*) into live_article_count
  from studio.articles
  where owner_id = actor and deleted_at is null;

  if tg_table_name = 'experiment_contents' then
    incoming_bytes := pg_catalog.octet_length((row_data -> 'content')::text);
    if experiment_content_count >= 200 then
      raise exception 'Anonymous Experiment revision limit reached. Sign in to keep saving.'
        using errcode = '54000';
    end if;
  elsif tg_table_name = 'article_contents' then
    incoming_bytes := pg_catalog.octet_length((row_data -> 'blocks')::text)
      + pg_catalog.octet_length(row_data ->> 'title')
      + pg_catalog.octet_length(row_data ->> 'locale');
    if article_content_count >= 200 then
      raise exception 'Anonymous Article revision limit reached. Sign in to keep saving.'
        using errcode = '54000';
    end if;
  elsif tg_table_name = 'experiment_snapshots' then
    incoming_bytes := coalesce(pg_catalog.octet_length(
      nullif(row_data -> 'reader_preview', 'null'::jsonb)::text
    ), 0);
    if snapshot_count >= 100 then
      raise exception 'Anonymous Snapshot limit reached. Sign in to keep saving.'
        using errcode = '54000';
    end if;
  elsif tg_table_name = 'experiments' and live_experiment_count >= 20 then
    raise exception 'Anonymous Experiment limit reached. Sign in to keep saving.'
      using errcode = '54000';
  elsif tg_table_name = 'articles' and live_article_count >= 20 then
    raise exception 'Anonymous Article limit reached. Sign in to keep saving.'
      using errcode = '54000';
  end if;

  if stored_bytes + incoming_bytes > 67108864 then
    raise exception 'Anonymous storage limit reached. Sign in to keep saving.'
      using errcode = '54000';
  end if;
  return new;
end;
$$;


drop function public.commit_admitted_experiment_snapshot_v1(uuid, uuid, text, jsonb, text, uuid, bigint);

CREATE OR REPLACE FUNCTION "public"."commit_admitted_experiment_snapshot_v1"("p_operation_id" "uuid", "p_snapshot_id" "uuid", "p_model_id" "text", "p_content" "jsonb", "p_surface_release_id" "text", "p_source_experiment_id" "uuid" DEFAULT NULL::"uuid", "p_expected_experiment_version" bigint DEFAULT NULL::bigint, "p_reader_preview" jsonb DEFAULT NULL::jsonb) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor uuid := auth.uid();
  request_body jsonb;
  replayed jsonb;
  target_snapshot_id uuid := coalesce(p_snapshot_id, gen_random_uuid());
  content_id uuid;
  surface_series_id text := p_content ->> 'surfaceSeriesId';
  source_row studio.experiments%rowtype;
  source_content jsonb;
  created_time timestamptz := now();
  result_body jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if (p_source_experiment_id is null) <> (p_expected_experiment_version is null) then
    raise exception 'source Experiment and expected version must be supplied together'
      using errcode = '22023';
  end if;
  if surface_series_id is null or btrim(surface_series_id) = '' then
    raise exception 'Standard Snapshot content must pin a Surface series'
      using errcode = '22023';
  end if;
  if p_surface_release_id is null or btrim(p_surface_release_id) = '' then
    raise exception 'Standard Snapshot must pin a Surface release'
      using errcode = '22023';
  end if;
  request_body := jsonb_build_object(
    'snapshotId', p_snapshot_id,
    'modelId', p_model_id,
    'content', p_content,
    'surfaceReleaseId', p_surface_release_id,
    'sourceExperimentId', p_source_experiment_id,
    'expectedExperimentVersion', p_expected_experiment_version
  ) || case when p_reader_preview is null then '{}'::jsonb
    -- Compute the digest on the server; never trust a client-declared digest
    -- for idempotency or duplicate the large optional payload in receipts.
    else jsonb_build_object('readerPreviewSha256', encode(extensions.digest(
      pg_catalog.convert_to(p_reader_preview::text, 'UTF8'), 'sha256'
    ), 'hex')) end;
  replayed := studio.begin_operation_v1(
    actor, p_operation_id, 'commit-admitted-experiment-snapshot-v1', request_body
  );
  if replayed is not null then return replayed; end if;

  if p_source_experiment_id is not null then
    select e.* into source_row
    from studio.experiments e
    where e.experiment_id = p_source_experiment_id
    for update of e;
    if not found or source_row.owner_id <> actor or source_row.deleted_at is not null then
      raise exception 'source Experiment not found' using errcode = 'P0002';
    end if;
    if source_row.version <> p_expected_experiment_version then
      raise exception 'source Experiment version conflict' using errcode = '40001';
    end if;
    select c.content into source_content
    from studio.experiment_contents c
    where c.content_id = source_row.current_content_id;
    if source_row.model_id <> p_model_id
      or not studio.snapshot_preserves_authored_content_v1(source_content, p_content)
    then
      raise exception 'Snapshot candidate is not the clean saved Experiment head'
        using errcode = '22023';
    end if;
  end if;

  if p_source_experiment_id is not null
    and source_content is not distinct from p_content
  then
    content_id := source_row.current_content_id;
  else
    insert into studio.experiment_contents (
      model_id, surface_series_id, content, created_by
    ) values (
      p_model_id, surface_series_id, p_content, actor
    ) returning experiment_contents.content_id into content_id;
  end if;
  insert into studio.experiment_snapshots (
    snapshot_id, owner_id, content_id, surface_release_id, created_at, reader_preview
  ) values (
    target_snapshot_id, actor, content_id, p_surface_release_id, created_time, p_reader_preview
  );
  if p_source_experiment_id is not null then
    insert into studio.experiment_snapshot_sources (
      snapshot_id, source_experiment_id, source_experiment_version
    ) values (
      target_snapshot_id, p_source_experiment_id, p_expected_experiment_version
    );
  end if;
  insert into studio.experiment_snapshot_retention (snapshot_id, retain_until)
  values (target_snapshot_id, created_time + interval '1 hour');

  result_body := jsonb_build_object(
    'schemaId', 'circleheart-studio-experiment-snapshot-v2',
    'snapshotId', target_snapshot_id,
    'content', p_content,
    'surfaceReleaseId', p_surface_release_id,
    'createdAt', to_char(created_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  return studio.finish_operation_v1(actor, p_operation_id, result_body);
end;
$$;

revoke all on function public.commit_admitted_experiment_snapshot_v1(uuid, uuid, text, jsonb, text, uuid, bigint, jsonb) from public, anon;
grant execute on function public.commit_admitted_experiment_snapshot_v1(uuid, uuid, text, jsonb, text, uuid, bigint, jsonb) to authenticated;

CREATE OR REPLACE FUNCTION "public"."read_experiment_snapshot_v1"("p_snapshot_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'schemaId', 'circleheart-studio-experiment-snapshot-v2',
    'snapshotId', snapshot.snapshot_id,
    'content', content.content,
    'surfaceReleaseId', snapshot.surface_release_id,
    'createdAt', to_char(snapshot.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  || case when snapshot.reader_preview is null then '{}'::jsonb
    else jsonb_build_object('readerPreview', snapshot.reader_preview) end
  from studio.experiment_snapshots as snapshot
  join studio.experiment_contents as content
    on content.content_id = snapshot.content_id
  where snapshot.snapshot_id = p_snapshot_id
    and studio.can_read_snapshot_v1(auth.uid(), snapshot.snapshot_id);
$$;
