# Repository constraints

Source code and tests are authoritative. Keep docs only for durable,
cross-cutting boundaries costly to reconstruct from code. Do not duplicate
discoverable IDs, catalogs, formulas, or worker mechanics; keep completed
research and superseded designs in Git history.

The exact model owns numerical and checkpoint semantics, analysis methods own
derived results, and the Model Surface owns exposure and presentation. Exact
frames must not reserve analysis outputs as placeholders. Persist only exact
model and Model Surface identities; Surfaces pin versioned analysis methods.

New exact-model identities inherit the latest compatible production Model
Surface and its pinned analysis methods by default; omissions or substitutions
require an explicit compatibility decision and regression coverage.

One human maintainer develops this repository with AI agents.

Before the first release there are no external users. Retire obsolete model
identities, code, tests, and CI instead of preserving legacy compatibility; keep
dependencies and regression coverage required by the current model and Surface.

Compose model documentation from reusable versioned modules, not per-mint
page implementations. Preserve self-contained historical documents and
assessments independently of retired code.

For article-content work only (planning, writing, or revising articles and
their figures or embedded experiments), read [Article authoring](docs/article-authoring.md)
before starting. Do not load it for unrelated tasks. Follow its further
references only as needed for the current authoring step.
