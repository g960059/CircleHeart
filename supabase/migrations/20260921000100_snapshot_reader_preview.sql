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
    else jsonb_build_object('readerPreview', p_reader_preview) end;
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
