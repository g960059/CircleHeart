# DESIGN-STUDIO-004: Article Placement and Briefing

Status: active cross-cutting contract

This document owns the durable relationship between an Article and an
interactive simulation. UI layout, route syntax, component structure, and
authoring steps are owned by source and tests.

## Placement ownership

An Article Placement contains:

- one immutable Snapshot reference;
- one Article-local Briefing;
- Article-local title and caption presentation.

The Snapshot owns complete executable content. The Briefing owns only the
Article projection of that content. Editing a title, caption, visible Scenario,
graph, output, or control selection therefore changes the Article, not the
Snapshot.

A Placement never follows a mutable Experiment. An Article may capture an
unsaved Session, and doing so must not create a saved Experiment unless the
author explicitly asks to save one.

## Briefing semantics

A Briefing is composed against the frozen Model Surface associated with the
Snapshot. It materializes:

- the Scenarios visible to the reader and the initial focus;
- complete authored graph definitions plus allowlisted presentation
  refinements;
- selected outputs; and
- selected controls with concrete Scenario bindings.

Selection-dependent Workbench bindings are resolved when the Briefing is
sealed. Later authoring focus or Scenario selection cannot silently retarget a
published output or control.

The Briefing also seals the reading form: the resting extent in the Article,
which selected graphs share one stage view, and whether Surface-pinned
analyses are re-measured automatically after a reader control change or only
on the reader's request. Output and control sections in the Reader are the
source panes themselves; comparison across Scenarios is composed from panes,
never from a Reader-side value matrix.

Briefing may narrow presentation but cannot change renderer identity, numerical
signals, analysis semantics, exact trace exclusions, or the Snapshot fixture.
A numerical or Surface change requires a newly admitted Snapshot.

A sealed-state analysis prepared for a Snapshot Scenario is optional
acceleration only. It is bound to the exact capture hash, artifact revision,
and Surface-pinned method, and it replaces the first measurement of that
unchanged capture; it is never a substitute for a measurement of changed
inputs and never a qualification claim.

## Reader equivalence

Compact, side-by-side, and full-session presentations are different extents of
the same effective graph and Briefing. They use the same registered renderer
and preserve authored items, labels, colors, windows, and analysis choices.
Layout density may change; scientific meaning may not.

Visibility affects presentation ownership only. It must not rewind, decimate,
replace, or give a different scientific clock to the numerical lane. A reader
may fork and explore a Snapshot, but durable saving remains an explicit action.

When interactive execution is unavailable, public content keeps a semantic
static summary rather than fabricated live values. Snapshot limitations and
model information remain accessible without repository vocabulary.

## Handoff and recovery

An Article-to-Session handoff is ephemeral, scoped to the authoring intent, and
single-use. Source owns its current route and token representation. Completion
must return an immutable Snapshot/Briefing pair or fail without inserting a
partial Placement.

Unreferenced captures may be reclaimed after their handoff grace boundary.
Once an Article version references a Snapshot, retention follows the reference
rather than the lifetime of the source Session or Experiment.
