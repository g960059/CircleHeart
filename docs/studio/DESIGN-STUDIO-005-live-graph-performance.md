# DESIGN-STUDIO-005: Live presentation boundary

Status: active cross-cutting contract

This document records only the durable boundary between exact numerical
execution and live presentation. Code and tests own batching, pacing,
calibration, diagnostics, worker-pool sizing, and performance budgets.

[DESIGN-STUDIO-007](DESIGN-STUDIO-007-flat-numerical-kernel.md) owns numerical
authority and scientific gates.

## Numerical and presentation authority

- The exact Worker is the sole owner of numerical advance, event handling,
  accepted clocks, and exact frames.
- The presentation layer may schedule delivery, retain presentation history,
  and paint graphs on the main thread or a rendering Worker. Neither owns
  scientific states or may reinterpret accepted values.
- Pressure and volume in a PV point come from the same accepted state.
- A visual cache, reduced history, or interpolated display is never evidence
  for settlement, analysis, Snapshot admission, or qualification.

## Comparative time

Simultaneously presented Scenarios share one released accepted-time prefix.
A slow numerical lane may slow the comparison, but no lane may acquire a
different implied playback clock merely to keep its graph visually smooth.
Playback and presentation controls are therefore group concerns rather than
independent scientific clocks.

Asynchronous drawing consumes only the released prefix. A renderer may
coalesce pending visual updates, but must retain the complete current visual
window across those updates and reject stale deliveries after a reset. Its
queue, caches, and failure recovery cannot become a second numerical owner.

## Compact presentation transport

The bundled exact runtime may expose a compact transport for intermediate
graph samples after validating them inside the Worker. That transport is a
presentation optimization only. It preserves exact accepted clocks and
selected scalar values, and retains a complete validated terminal frame for
latest-value consumers.

Capture, restore, control commits, final analysis results, Snapshot admission,
authoring, storage, and registry boundaries continue to use their complete
typed contracts. Public or untrusted protocol input remains fully validated.
Changing the compact transport must not change numerical results, exact model
identity, or persisted content.

## Visibility and reuse

Workbench and Reader may avoid materializing outputs that no mounted pane
uses. Visibility changes presentation ownership only; it must not pause,
rewind, decimate, or substitute the numerical lane.

Ephemeral presentation or analysis reuse is valid only while its model,
fixture, Scenario, and input epoch still match. Such reuse is neither durable
content nor evidence of settlement or qualification.

## Resource quality of service

Live numerical lanes have priority over speculative background work.
Background work made stale by a changed input epoch is discarded rather than
allowed to delay its replacement. Explicit user operations remain bounded and
must not silently alter the accepted numerical path.

Resource policy may affect latency and how quickly optional analyses appear.
It must not change exact values, omit accepted model time, or present Scenarios
at unequal scientific clocks.

## Performance claims

Automated browser profiles are regression tools, not evidence of support for a
physical device class. A device-performance claim requires measurement on
named physical hardware under the intended Scenario count and interaction
load. Evidence must separate numerical work from transport, main-thread
presentation, and rendering so that an optimization is attributed to the
correct owner.
