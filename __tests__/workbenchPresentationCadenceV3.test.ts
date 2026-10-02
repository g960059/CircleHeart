import { describe, expect, it } from "vitest";
import { WorkbenchPresentationPressureV3 } from "@/components/workbench/runtime/WorkbenchPresentationCadenceV3";

describe("measured presentation pressure", () => {
  it("keeps a 60 Hz target on both 60 and 120 Hz displays", () => {
    for (const period of [1_000 / 60, 1_000 / 120]) {
      const pressure = new WorkbenchPresentationPressureV3();
      for (let i = 0; i < 2_000; i++) pressure.observe(i * period);
      expect(pressure.multiplier).toBe(1);
    }
  });

  it("requires sustained overload and sustained recovery, without oscillating", () => {
    const pressure = new WorkbenchPresentationPressureV3();
    let time = 0;
    pressure.observe(time);
    for (let i = 0; i < 59; i++) pressure.observe(time += 33.4);
    expect(pressure.multiplier).toBe(1);
    for (let i = 0; i < 3; i++) pressure.observe(time += 33.4);
    expect(pressure.multiplier).toBe(2);
    for (let i = 0; i < 450; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(2);
    for (let i = 0; i < 400; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(1);
  });

  it("ignores an isolated stall, hidden windows, and suspended clocks", () => {
    const pressure = new WorkbenchPresentationPressureV3();
    let time = 0;
    pressure.observe(time);
    pressure.observe(time += 400);
    for (let i = 0; i < 150; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(1);
    for (let i = 0; i < 150; i++) pressure.observe(time += 50, false);
    pressure.observe(time += 60_000);
    for (let i = 0; i < 150; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(1);
  });

  it("retains measured quality through a control pause without counting paused time", () => {
    const pressure = new WorkbenchPresentationPressureV3();
    let time = 0;
    for (let i = 0; i < 65; i++) pressure.observe(time += 33.4);
    expect(pressure.multiplier).toBe(2);
    // More than six seconds of observed headroom survives a control pause.
    for (let i = 0; i < 480; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(2);
    pressure.restartObservation();
    time += 5_000;
    pressure.observe(time);
    expect(pressure.multiplier).toBe(2);
    for (let i = 0; i < 245; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(1);
  });

  it("does not count short tab hiding as an overloaded frame", () => {
    const pressure = new WorkbenchPresentationPressureV3();
    let time = 0;
    for (let i = 0; i < 100; i++) pressure.observe(time += 16.7);
    pressure.restartObservation();
    time += 500;
    pressure.restartObservation();
    for (let i = 0; i < 150; i++) pressure.observe(time += 16.7);
    expect(pressure.multiplier).toBe(1);
  });
});
