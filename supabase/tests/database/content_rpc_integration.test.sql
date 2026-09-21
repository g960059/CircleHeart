begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

insert into auth.users (
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_anonymous,
  created_at,
  updated_at
) values
  (
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    now(),
    now()
  );

select public.register_model_release_v2(
  'model/integration-test-v1',
  'model/integration-test',
  'Integration test model',
  '{"schemaId":"circleheart-studio-exact-model-kernel-v3","modelId":"model/integration-test-v1","modelFamilyId":"model/integration-test"}'::jsonb,
  repeat('b', 64),
  'models/integration-test-v1/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/model.mjs',
  repeat('a', 64),
  'integration-test',
  '{"schemaId":"fixture/integration-test-v1"}'::jsonb,
  'analysis/integration-test-v1',
  null,
  null
);

select public.set_model_release_stage_v1(
  'model/integration-test-v1', 'stable'
);

insert into studio.model_surface_releases (
  surface_release_id, surface_series_id, predecessor_surface_release_id,
  model_family_id, display_name, manifest, source_commit
) values (
  'surface/integration-test-v1', 'surface-series/integration-test', null,
  'model/integration-test', 'Integration test Surface',
  '{
    "schemaId":"circleheart-studio-model-surface-release-v1",
    "surfaceReleaseId":"surface/integration-test-v1",
    "surfaceSeriesId":"surface-series/integration-test",
    "predecessorSurfaceReleaseId":null,
    "modelFamilyId":"model/integration-test",
    "displayName":"Integration test Surface",
    "exposedExactOutputIds":[],
    "controlCatalog":[],"derivedOutputCatalog":[],"graphCatalog":[],
    "knobCatalog":[],"protocolCatalog":[]
  }'::jsonb,
  'integration-test'
);
insert into studio.model_surface_release_availability (
  surface_release_id, stage
) values ('surface/integration-test-v1', 'stable');

insert into studio.model_surface_releases (
  surface_release_id, surface_series_id, predecessor_surface_release_id,
  model_family_id, display_name, manifest, source_commit
) values (
  'surface/integration-alternate-v1',
  'surface-series/integration-alternate',
  null,
  'model/integration-test',
  'Integration alternate Surface',
  '{
    "schemaId":"circleheart-studio-model-surface-release-v1",
    "surfaceReleaseId":"surface/integration-alternate-v1",
    "surfaceSeriesId":"surface-series/integration-alternate",
    "predecessorSurfaceReleaseId":null,
    "modelFamilyId":"model/integration-test",
    "displayName":"Integration alternate Surface",
    "exposedExactOutputIds":[],
    "controlCatalog":[],"derivedOutputCatalog":[],"graphCatalog":[],
    "knobCatalog":[],"protocolCatalog":[]
  }'::jsonb,
  'integration-test'
);
insert into studio.model_surface_release_availability (
  surface_release_id, stage
) values ('surface/integration-alternate-v1', 'stable');

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

create temporary table rpc_state (
  key text primary key,
  value jsonb not null
);

insert into rpc_state (key, value)
select 'save', public.save_experiment_v1(
  '20000000-0000-0000-0000-000000000001',
  null,
  null,
  'Integration baseline',
  'model/integration-test-v1',
  '{
    "modelId":"model/integration-test-v1",
    "surfaceSeriesId":"surface-series/integration-test",
    "scenarios":[{
      "scenarioId":"scenario/baseline",
      "label":"Baseline",
      "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":1}}
    }],
    "surface":{}
  }'::jsonb
);

select ok(
  not (select value from rpc_state where key = 'save') ? 'content',
  'Save RPC returns a compact result'
);

select is(
  (select (value ->> 'version')::bigint from rpc_state where key = 'save'),
  0::bigint,
  'First Save creates version zero'
);

select ok(
  not (
    select request
    from studio.operation_receipts
    where operation_id = '20000000-0000-0000-0000-000000000001'
  ) ? 'content',
  'Committed operation receipt does not duplicate Experiment content'
);

select matches(
  (
    select request ->> 'contentSha256'
    from studio.operation_receipts
    where operation_id = '20000000-0000-0000-0000-000000000001'
  ),
  '^[0-9a-f]{64}$',
  'Committed operation receipt fingerprints Experiment content'
);

select ok(
  (
    select expires_at >= created_at + interval '30 days'
    from studio.operation_receipts
    where operation_id = '20000000-0000-0000-0000-000000000001'
  ),
  'Mutation request fingerprints remain authoritative for at least 30 days'
);

select ok(
  to_regclass('studio.authoring_command_bindings') is null,
  'The superseded authoring command binding table is absent'
);

select ok(
  to_regprocedure(
    'public.claim_my_authoring_command_v1(uuid,text,text)'
  ) is null,
  'The superseded authoring command claim RPC is absent'
);

select is(
  public.read_my_authoring_operation_receipt_v1(
    '20000000-0000-0000-0000-000000000001'
  ) ->> 'status',
  'committed',
  'The author can read a committed AI authoring operation receipt'
);

select is(
  public.save_experiment_v1(
    '20000000-0000-0000-0000-000000000001',
    null,
    null,
    'Integration baseline',
    'model/integration-test-v1',
    '{
      "modelId":"model/integration-test-v1",
      "surfaceSeriesId":"surface-series/integration-test",
      "scenarios":[{
        "scenarioId":"scenario/baseline",
        "label":"Baseline",
        "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":1}}
      }],
      "surface":{}
    }'::jsonb
  ),
  (select value from rpc_state where key = 'save'),
  'Exact operation replay returns the original committed result'
);

select is(
  (select count(*) from studio.experiment_contents),
  1::bigint,
  'Exact operation replay creates no duplicate immutable content'
);

select throws_ok(
  $$
    select public.save_experiment_v1(
      '20000000-0000-0000-0000-000000000002',
      ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
      99,
      'Stale update',
      'model/integration-test-v1',
      '{
        "modelId":"model/integration-test-v1",
        "surfaceSeriesId":"surface-series/integration-test",
        "scenarios":[{
          "scenarioId":"scenario/baseline",
          "label":"Baseline",
          "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":1}}
        }],
        "surface":{}
      }'::jsonb
    )
  $$,
  '40001',
  'Experiment version conflict',
  'Stale compare-and-swap is rejected'
);

select throws_ok(
  $$
    select public.commit_admitted_experiment_snapshot_v1(
      '20000000-0000-0000-0000-000000000016',
      null,
      'model/integration-test-v1',
      '{
        "modelId":"model/integration-test-v1",
        "surfaceSeriesId":"surface-series/integration-alternate",
        "scenarios":[{
          "scenarioId":"scenario/baseline",
          "label":"Baseline",
          "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":2}}
        }],
        "surface":{}
      }'::jsonb,
      'surface/integration-alternate-v1',
      ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
      0
    )
  $$,
  '22023',
  'Snapshot candidate is not the clean saved Experiment head',
  'A Snapshot cannot switch the saved Experiment to another Surface series'
);

insert into rpc_state (key, value)
select 'snapshot', public.commit_admitted_experiment_snapshot_v1(
  '20000000-0000-0000-0000-000000000003',
  null,
  'model/integration-test-v1',
  '{
    "modelId":"model/integration-test-v1",
    "surfaceSeriesId":"surface-series/integration-test",
    "scenarios":[{
      "scenarioId":"scenario/baseline",
      "label":"Baseline",
      "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":2}}
    }],
    "surface":{}
  }'::jsonb,
  'surface/integration-test-v1',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
  0,
  '{"schemaId":"circleheart-experiment-reader-preview-v1","sourceSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","previewSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","scenarios":[]}'::jsonb
);

select is(
  public.read_experiment_snapshot_v1(((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid) #>> '{readerPreview,schemaId}',
  'circleheart-experiment-reader-preview-v1', 'Owner reads the optional sealed display cache'
);
select ok(
  not (public.read_experiment_snapshot_v1(((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid) -> 'content') ? 'readerPreview',
  'Display cache does not enter exact model content'
);
select ok(
  not (select value from rpc_state where key='snapshot') ? 'readerPreview',
  'Snapshot commit acknowledgement does not duplicate the display payload'
);

select ok(
  not (select request from studio.operation_receipts where operation_id = '20000000-0000-0000-0000-000000000003') ? 'readerPreview',
  'Snapshot retry receipt does not duplicate the optional display payload'
);
select matches(
  (select request ->> 'readerPreviewSha256' from studio.operation_receipts where operation_id = '20000000-0000-0000-0000-000000000003'),
  '^[0-9a-f]{64}$', 'Snapshot retry receipt keeps a compact preview fingerprint'
);
select is(
  (select request ->> 'readerPreviewSha256' from studio.operation_receipts where operation_id = '20000000-0000-0000-0000-000000000003'),
  encode(extensions.digest(convert_to((public.read_experiment_snapshot_v1(
    ((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid
  ) -> 'readerPreview')::text, 'UTF8'), 'sha256'), 'hex'),
  'Preview receipt fingerprint is computed from the payload rather than trusting its claimed digest'
);


select ok(
  not (select value from rpc_state where key = 'snapshot') ? 'content',
  'Snapshot RPC returns identity without duplicating content'
);

select ok(
  (
    select r.retain_until
      >= pg_catalog.statement_timestamp() + interval '23 hours'
    from studio.experiment_snapshot_retention r
    where r.snapshot_id = (
      (select value ->> 'snapshotId' from rpc_state where key = 'snapshot')
    )::uuid
  ),
  'New unreferenced Snapshot has a 24-hour handoff grace'
);

select is(public.read_public_snapshot_title_v1(((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid),null::text,'Private Snapshot source title is not exposed');

select public.publish_experiment_v1(
  '20000000-0000-0000-0000-000000000004',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
  0,
  ((select value ->> 'snapshotId' from rpc_state where key = 'snapshot'))::uuid,
  'integration-public-experiment'
);

select is(public.read_public_snapshot_title_v1(((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid),'Integration baseline'::text,'Public Snapshot resolves its Experiment title');

select is(
  public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid) ->> 'publishedVersion',
  '0'::text,
  'Workbench publication remembers the saved version without changing Snapshot identity'
);
select ok(
  public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid) ->> 'publishedAt' is not null,
  'Workbench can display the current publication time'
);

select is(
  public.read_public_experiment_v1('integration-public-experiment')
    #>> '{snapshot,snapshotId}',
  (select value ->> 'snapshotId' from rpc_state where key = 'snapshot'),
  'Published Experiment resolves to the admitted Snapshot'
);

select is(
  (
    select r.retain_until
    from studio.experiment_snapshot_retention r
    where r.snapshot_id = (
      (select value ->> 'snapshotId' from rpc_state where key = 'snapshot')
    )::uuid
  ),
  null::timestamptz,
  'Published Snapshot is retained without an expiry'
);

select public.register_model_release_v2(
  'model/integration-test-dev-v2',
  'model/integration-test',
  'Integration test dev model',
  '{"schemaId":"circleheart-studio-exact-model-kernel-v3","modelId":"model/integration-test-dev-v2","modelFamilyId":"model/integration-test"}'::jsonb,
  repeat('d', 64),
  'models/integration-test-dev-v2/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/model.mjs',
  repeat('c', 64),
  'integration-test-dev',
  '{"schemaId":"fixture/integration-test-v1"}'::jsonb,
  'analysis/integration-test-v1',
  null,
  null
);

select throws_ok(
  $$
    select public.save_experiment_v1(
      '20000000-0000-0000-0000-000000000011',
      null,
      null,
      'Surface-less content must fail',
      'model/integration-test-dev-v2',
      '{
        "modelId":"model/integration-test-dev-v2",
        "scenarios":[{
          "scenarioId":"scenario/dev",
          "label":"Development",
          "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":1}}
        }],
        "surface":{}
      }'::jsonb
    )
  $$,
  '22023',
  'Standard Experiment content must pin a Surface series',
  'Surface-less Experiment content is rejected at the authority boundary'
);

insert into rpc_state (key, value)
select 'dev-save', public.save_experiment_v1(
  '20000000-0000-0000-0000-000000000007',
  null,
  null,
  'Development model experiment',
  'model/integration-test-dev-v2',
  '{
    "modelId":"model/integration-test-dev-v2",
    "surfaceSeriesId":"surface-series/integration-test",
    "scenarios":[{
      "scenarioId":"scenario/dev",
      "label":"Development",
      "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":1}}
    }],
    "surface":{}
  }'::jsonb
);

select throws_ok(
  $$
    select public.commit_admitted_experiment_snapshot_v1(
      '20000000-0000-0000-0000-000000000012',
      null,
      'model/integration-test-dev-v2',
      '{
        "modelId":"model/integration-test-dev-v2",
        "surfaceSeriesId":"surface-series/integration-test",
        "scenarios":[{
          "scenarioId":"scenario/dev",
          "label":"Development",
          "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":2}}
        }],
        "surface":{}
      }'::jsonb,
      null,
      ((select value ->> 'experimentId' from rpc_state where key = 'dev-save'))::uuid,
      0
    )
  $$,
  '22023',
  'Standard Snapshot must pin a Surface release',
  'Surface-less Snapshot capture is rejected at the authority boundary'
);

insert into rpc_state (key, value)
select 'dev-snapshot', public.commit_admitted_experiment_snapshot_v1(
  '20000000-0000-0000-0000-000000000008',
  null,
  'model/integration-test-dev-v2',
  '{
    "modelId":"model/integration-test-dev-v2",
    "surfaceSeriesId":"surface-series/integration-test",
    "scenarios":[{
      "scenarioId":"scenario/dev",
      "label":"Development",
      "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":2}}
    }],
    "surface":{}
  }'::jsonb,
  'surface/integration-test-v1',
  ((select value ->> 'experimentId' from rpc_state where key = 'dev-save'))::uuid,
  0
);

select throws_ok(
  $$
    select public.publish_experiment_v1(
      '20000000-0000-0000-0000-000000000009',
      ((select value ->> 'experimentId' from rpc_state where key = 'dev-save'))::uuid,
      0,
      ((select value ->> 'snapshotId' from rpc_state where key = 'dev-snapshot'))::uuid,
      'development-model-must-not-publish'
    )
  $$,
  '22023',
  'Only stable model releases may be published (found dev)',
  'Dev model content may be saved and captured but not published'
);

select public.unpublish_experiment_v1(
  '20000000-0000-0000-0000-000000000005',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
  0
);

select is(
  public.read_public_experiment_v1('integration-public-experiment'),
  null::jsonb,
  'Unpublished Experiment is no longer publicly readable'
);
select is(public.read_public_snapshot_title_v1(((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid),null::text,'Unpublishing hides the source title even during Snapshot retention');

select is(
  public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid) ->> 'publishedVersion',
  null::text,
  'Unpublishing clears the publication comparison metadata'
);

select ok(
  (
    select r.retain_until between
      pg_catalog.statement_timestamp() + interval '50 minutes'
      and pg_catalog.statement_timestamp() + interval '70 minutes'
    from studio.experiment_snapshot_retention r
    where r.snapshot_id = (
      (select value ->> 'snapshotId' from rpc_state where key = 'snapshot')
    )::uuid
  ),
  'Unpublished Snapshot receives the explicit one-hour recovery window'
);

update studio.model_release_availability
set loadable = false
where model_id = 'model/integration-test-v1';

select throws_ok(
  $$
    select public.publish_experiment_v1(
      '20000000-0000-0000-0000-000000000010',
      ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
      0,
      ((select value ->> 'snapshotId' from rpc_state where key = 'snapshot'))::uuid,
      'disabled-model-must-not-publish'
    )
  $$,
  '22023',
  'Snapshot model release is disabled',
  'Emergency-disabled exact models cannot create new publications'
);

update studio.model_release_availability
set loadable = true
where model_id = 'model/integration-test-v1';

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  public.read_my_authoring_operation_receipt_v1(
    '20000000-0000-0000-0000-000000000001'
  ),
  null::jsonb,
  'Another authenticated actor cannot read the operation receipt'
);

select is(
  public.read_my_experiment_v1(
    ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid
  ),
  null::jsonb,
  'Another authenticated owner cannot read the private Experiment'
);

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":true}',
  true
);

select ok(
  public.save_experiment_v1(
    '20000000-0000-0000-0000-000000000006',
    null,
    null,
    'Anonymous baseline',
    'model/integration-test-v1',
    '{
      "modelId":"model/integration-test-v1",
      "surfaceSeriesId":"surface-series/integration-test",
      "scenarios":[{
        "scenarioId":"scenario/anonymous",
        "label":"Anonymous",
        "capture":{"fixture":{"control":1},"checkpoint":{"acceptedTimeSec":1}}
      }],
      "surface":{}
    }'::jsonb
  ) ? 'experimentId',
  'Anonymous Save crosses the polymorphic storage-quota trigger'
);

-- Repeated optional previews must consume the existing 64 MiB budget too.
-- Reuse content so this exercises preview storage independently of revisions.
do $$
declare source_id uuid;
begin
  select current_content_id into strict source_id from studio.experiments
  where owner_id = '10000000-0000-0000-0000-000000000003';
  for n in 1..22 loop
    insert into studio.experiment_snapshots (snapshot_id, owner_id, content_id, surface_release_id, reader_preview)
    values (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', source_id, 'surface/integration-test-v1',
      jsonb_build_object('schemaId', 'circleheart-experiment-reader-preview-v1',
        'sourceSha256', repeat('a',64), 'previewSha256', repeat('b',64), 'payload', repeat('x',2990000)));
  end loop;
end;
$$;

select throws_ok($sql$
  insert into studio.experiment_snapshots (snapshot_id, owner_id, content_id, surface_release_id, reader_preview)
  select gen_random_uuid(), owner_id, current_content_id, 'surface/integration-test-v1',
    jsonb_build_object('schemaId', 'circleheart-experiment-reader-preview-v1',
      'sourceSha256', repeat('a',64), 'previewSha256', repeat('b',64), 'payload', repeat('x',2990000))
  from studio.experiments where owner_id = '10000000-0000-0000-0000-000000000003'
$sql$, '54000', 'Anonymous storage limit reached. Sign in to keep saving.',
  'Incoming preview bytes cannot bypass the anonymous storage budget');

select throws_ok($sql$
  insert into studio.experiment_contents (model_id, surface_series_id, content, created_by)
  select c.model_id, c.surface_series_id,
    jsonb_set(c.content, '{scenarios,0,capture,fixture,quotaPadding}', to_jsonb(repeat('x',1500000))), e.owner_id
  from studio.experiments e join studio.experiment_contents c on c.content_id = e.current_content_id
  where e.owner_id = '10000000-0000-0000-0000-000000000003'
$sql$, '54000', 'Anonymous storage limit reached. Sign in to keep saving.',
  'Previously stored previews also count against later content writes');

-- A publication's compared version belongs to its admitted source, not the
-- mutable version used to authorize a later publication request.
select pg_catalog.set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
select public.publish_experiment_v1('20000000-0000-0000-0000-000000000020',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid, 0,
  ((select value ->> 'snapshotId' from rpc_state where key = 'snapshot'))::uuid, 'integration-public-experiment');
select public.save_experiment_v1(
  '20000000-0000-0000-0000-000000000021',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid,
  0, 'Changed baseline', 'model/integration-test-v1',
  jsonb_set(public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid)#>'{experiment,content}',
    '{scenarios,0,capture,fixture,control}', '2'::jsonb)
);
select is(public.read_public_experiment_v1('integration-public-experiment')->>'title', 'Integration baseline',
  'Saving a new title leaves the public route title unchanged');
select is(public.read_public_snapshot_title_v1(((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid), 'Integration baseline',
  'Saving a new title leaves the public Snapshot title unchanged');
select is(public.list_public_experiment_summaries_v1()#>>'{items,0,title}', 'Integration baseline',
  'Saving a new title leaves the public directory title unchanged');
select public.publish_experiment_v1('20000000-0000-0000-0000-000000000022',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid, 1,
  ((select value ->> 'snapshotId' from rpc_state where key = 'snapshot'))::uuid, 'integration-public-experiment');
select is(public.read_public_experiment_v1('integration-public-experiment')->>'title', 'Changed baseline',
  'Explicit publication makes the saved title public');
select is(public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid)->>'publishedVersion',
  '0', 'Publishing an older admitted Snapshot does not claim the new saved version');
insert into rpc_state(key,value) select 'updated-snapshot', public.commit_admitted_experiment_snapshot_v1(
  '20000000-0000-0000-0000-000000000023', null, 'model/integration-test-v1',
  public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid)#>'{experiment,content}',
  'surface/integration-test-v1', ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid, 1);
select public.publish_experiment_v1('20000000-0000-0000-0000-000000000024',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid, 1,
  ((select value ->> 'snapshotId' from rpc_state where key = 'updated-snapshot'))::uuid, 'integration-public-experiment');
select is(public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid)->>'publishedVersion',
  '1', 'A new admitted capture records the saved version it actually used');
select pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(public.read_public_experiment_v1('integration-public-experiment')#>>'{snapshot,snapshotId}',
  (select value->>'snapshotId' from rpc_state where key='updated-snapshot'), 'The unchanged public slug resolves the replacement Snapshot for anonymous readers');
select pg_catalog.set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
update studio.experiment_snapshot_sources set source_experiment_version = null
where snapshot_id = ((select value->>'snapshotId' from rpc_state where key='snapshot'))::uuid;
select public.publish_experiment_v1('20000000-0000-0000-0000-000000000025',
  ((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid, 1,
  ((select value ->> 'snapshotId' from rpc_state where key = 'snapshot'))::uuid, 'integration-public-experiment');
select is(public.read_my_experiment_v1(((select value ->> 'experimentId' from rpc_state where key = 'save'))::uuid)->>'publishedVersion',
  null::text, 'Legacy Snapshot provenance remains unknown rather than being inferred from the mutable head');

select * from finish();

rollback;
