/** Two algebraic perfusion paths between the shared capillary reservoir and
 * pulmonary venous reservoir. These are real hydraulic branches, with no
 * additional blood storage. The same branch flows drive gas exchange. */
export type ParallelPulmonaryPathV1 = Readonly<{
  resistanceMmHgSecPerMl: number;
  externalPressureMmHg: number;
}>;
export type ParallelPulmonaryPathsV1 = readonly [ParallelPulmonaryPathV1, ParallelPulmonaryPathV1];

export function evaluateParallelPulmonaryPathsV1(
  paths: ParallelPulmonaryPathsV1, upstreamMmHg: number, downstreamMmHg: number,
) {
  let dUp = 0, dDown = 0;
  const flows = paths.map(path => {
    if (!(path.resistanceMmHgSecPerMl > 0) || !Number.isFinite(path.resistanceMmHgSecPerMl)
      || !Number.isFinite(path.externalPressureMmHg) || !Number.isFinite(upstreamMmHg)
      || !Number.isFinite(downstreamMmHg)) throw new Error("Invalid parallel pulmonary hydraulic input");
    // Smooth collapsible Starling resistor, symmetric on flow reversal.
    // External pressure cannot itself pump blood through an occluded segment.
    const positive = (p: number) => {
      const x = p - path.externalPressureMmHg;
      const root = Math.hypot(x, 0.25);
      return { p: (x + root) / 2, derivative: (1 + x / root) / 2 };
    };
    const up = positive(upstreamMmHg), down = positive(downstreamMmHg);
    dUp += up.derivative / path.resistanceMmHgSecPerMl;
    dDown -= down.derivative / path.resistanceMmHgSecPerMl;
    return (up.p - down.p) / path.resistanceMmHgSecPerMl;
  }) as [number, number];
  return { flowMlPerSecByUnit: flows, totalFlowMlPerSec: flows[0] + flows[1],
    upstreamMlPerSecPerMmHg: dUp, downstreamMlPerSecPerMmHg: dDown };
}
