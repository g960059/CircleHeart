# CircleHeart Supabase boundary

Supabase is the durable trust and publication spine. Interactive numerical
execution remains in browser Workers.

Source migrations, generated types, configuration, and tests own current
tables, RPC names, quotas, schedules, and operational commands.

## Owned responsibilities

Supabase owns:

- authentication and identity linking;
- immutable exact-model and Model-Surface registry records and certified
  artifact-revision bindings;
- private Experiment and Article ownership;
- immutable Snapshot and Article-content storage;
- public pointers and anonymous read authorization;
- idempotent semantic mutations with optimistic concurrency; and
- bounded collection of unreachable immutable content.

It does not own equations, solver execution, runtime settlement, or clinical
validation.

## Client trust boundary

Browser and authoring clients use a publishable key and have no direct table
write authority. Durable mutations pass through versioned semantic RPCs under
RLS. Service-role credentials must never enter browser configuration, command
payloads, logs, or repository files.

Each mutation identity binds one canonical request. Replaying that request may
return its committed result; reusing the identity for another request fails
closed. Mutable resources also require their expected version so a stale
client cannot overwrite a newer authoring head.

Snapshot persistence accepts the output of first-party numerical admission but
does not independently rerun or certify the numerical model. This protects the
ordinary product path, not against a hostile authenticated client. A future
server-verified scientific claim requires a separate trusted execution and
signed-receipt boundary.

## Content and reference lifecycle

Experiments are mutable private heads. Snapshots and Article content revisions
are immutable. Article Placements reference neutral Snapshots; the database
derives reference ownership from validated Article blocks rather than trusting
a second caller-supplied reference list. Article tags belong to the content
revision, so public pages, summaries, and tag vocabulary expose only the tags
of the revision a live publication points to.

A Snapshot is readable by its owner or through an authorized published
Experiment/Article reference. Draft references do not make it public.
Unpublish and soft delete release pointers; garbage collection may remove only
unreachable content after its handoff and retention boundaries.

Anonymous visitors do not need an account merely to read or fork. Saving
private work requires an authenticated identity. Publication requires a
non-anonymous account and never follows automatically from Save, Snapshot
admission, or Article placement.

## Release identity

A changed exact scientific manifest requires a new immutable `modelId`.
Changed artifact bytes may remain under one `modelId` only through the
repository's predecessor-bound, byte-exact frame and checkpoint equivalence
path. Presentation, Auth, storage, Article, and hosting releases do not by
themselves change exact numerical identity.

Analysis methods are source-owned and selected by immutable IDs in the Model
Surface. The physical analysis-profile column is migration-only storage;
current tickets reject it and current APIs neither select nor expose it. A
new-Session default fixture may change without minting a new `modelId`; saved
content keeps its own fixture/checkpoint, while visible naming belongs to the
Surface. The fuller ownership model is in
[DESIGN-STUDIO-006](../docs/studio/DESIGN-STUDIO-006-model-surface-release-and-model-lab.md).

Active-bundle replacement affects only new Sessions. Existing Experiments and
Snapshots retain their stored exact-model and Surface pins and must never
follow a later launch target.

Deploy clients and migrations before publishing or activating a Surface that
uses new method IDs or manifest fields; stale clients fail closed.

## Migration and rollout boundary

Checked-in migrations are the ordered database source of truth. Once a project
contains user data, schema evolution is forward-only: never squash, rewrite,
or repair applied history in place.

A disposable pre-release project with no user content may be reset from the
checked-in migration sequence after its emptiness is verified. This exception
does not apply to a project containing Auth identities or authored/published
content.

Registry publication and active-bundle activation are separate trusted
operations. Registering a new model/Surface identity never changes the active
bundle. A certified artifact-revision rebind may update the implementation
resolved beneath the same active `modelId`, but only through its separate
equivalence and compare-and-swap authority. Changing the active model/Surface
pair remains an explicit compare-and-swap operation.
