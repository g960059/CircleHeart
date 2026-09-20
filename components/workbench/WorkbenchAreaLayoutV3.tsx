import React from "react";

export const WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3 =
  "circleheart.workbench.area-layout.v2";

export type WorkbenchAreaLayoutPreferenceV3 = Readonly<{
  inspectorWidthRatio: number;
  outputHeightRatio: number;
}>;

export const DEFAULT_WORKBENCH_AREA_LAYOUT_V3 = Object.freeze({
  inspectorWidthRatio: 0.24,
  // The default output catalog fits on one desktop row. Keep the drawer just
  // tall enough for its tab strip and values; users can still resize it.
  outputHeightRatio: 0.18,
}) satisfies WorkbenchAreaLayoutPreferenceV3;

const clampRatio = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function normalizeWorkbenchAreaLayoutPreferenceV3(
  value: unknown,
  fallback: WorkbenchAreaLayoutPreferenceV3 = DEFAULT_WORKBENCH_AREA_LAYOUT_V3,
): WorkbenchAreaLayoutPreferenceV3 {
  if (value === null || typeof value !== "object") {
    return fallback;
  }
  const candidate = value as Partial<WorkbenchAreaLayoutPreferenceV3>;
  const inspectorWidthRatio = Number(candidate.inspectorWidthRatio);
  const outputHeightRatio = Number(candidate.outputHeightRatio);
  return Object.freeze({
    inspectorWidthRatio: Number.isFinite(inspectorWidthRatio)
      ? clampRatio(inspectorWidthRatio, 0.18, 0.42)
      : fallback.inspectorWidthRatio,
    outputHeightRatio: Number.isFinite(outputHeightRatio)
      ? clampRatio(outputHeightRatio, 0.18, 0.45)
      : fallback.outputHeightRatio,
  });
}

export function loadWorkbenchAreaLayoutPreferenceV3(
  storage: Pick<Storage, "getItem"> | null,
  storageKey = WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3,
  defaultPreference: WorkbenchAreaLayoutPreferenceV3 = DEFAULT_WORKBENCH_AREA_LAYOUT_V3,
): WorkbenchAreaLayoutPreferenceV3 {
  if (storage === null) return defaultPreference;
  try {
    const serialized = storage.getItem(storageKey);
    return serialized === null
      ? defaultPreference
      : normalizeWorkbenchAreaLayoutPreferenceV3(JSON.parse(serialized), defaultPreference);
  } catch {
    return defaultPreference;
  }
}

export function saveWorkbenchAreaLayoutPreferenceV3(
  storage: Pick<Storage, "setItem"> | null,
  preference: WorkbenchAreaLayoutPreferenceV3,
  storageKey = WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3,
): void {
  if (storage === null) return;
  try {
    storage.setItem(
      storageKey,
      JSON.stringify(preference),
    );
  } catch {
    // Layout personalization must never prevent the Workbench from running.
  }
}

type WorkbenchAreaResizeAxisV3 = "inspector" | "outputs";

type WorkbenchAreaLayoutPropsV3 = Readonly<{
  children: React.ReactNode;
  className?: string;
  inspectorResizeLabel: string;
  outputResizeLabel: string;
  preferenceStorageKey?: string;
  defaultPreference?: WorkbenchAreaLayoutPreferenceV3;
}>;

/**
 * Device-local Workbench chrome. These proportions depend on the viewport and
 * are deliberately excluded from Experiment, Snapshot, and Briefing data.
 */
export function WorkbenchAreaLayoutV3({
  children,
  className = "",
  inspectorResizeLabel,
  outputResizeLabel,
  preferenceStorageKey = WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3,
  defaultPreference = DEFAULT_WORKBENCH_AREA_LAYOUT_V3,
}: WorkbenchAreaLayoutPropsV3) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [desktop, setDesktop] = React.useState(() =>
    typeof window !== "undefined"
      && window.matchMedia("(min-width: 1024px)").matches);
  const [preference, setPreference] = React.useState(() =>
    loadWorkbenchAreaLayoutPreferenceV3(
      typeof window === "undefined" ? null : window.localStorage,
      preferenceStorageKey,
      defaultPreference,
    ));
  const preferenceRef = React.useRef(preference);
  preferenceRef.current = preference;
  const dragRef = React.useRef<Readonly<{
    axis: WorkbenchAreaResizeAxisV3;
    pointerId: number;
  }> | null>(null);

  const applyPreference = React.useCallback(
    (next: WorkbenchAreaLayoutPreferenceV3) => {
      preferenceRef.current = next;
      const element = containerRef.current;
      if (element === null) return;
      element.style.setProperty(
        "--wb-inspector-size",
        `${next.inspectorWidthRatio * 100}%`,
      );
      element.style.setProperty(
        "--wb-output-size",
        `${next.outputHeightRatio * 100}%`,
      );
    },
    [],
  );

  const commitPreference = React.useCallback(
    (next: WorkbenchAreaLayoutPreferenceV3) => {
      const normalized = normalizeWorkbenchAreaLayoutPreferenceV3(next);
      applyPreference(normalized);
      setPreference(normalized);
      saveWorkbenchAreaLayoutPreferenceV3(
        typeof window === "undefined" ? null : window.localStorage,
        normalized,
        preferenceStorageKey,
      );
    },
    [applyPreference, preferenceStorageKey],
  );

  React.useEffect(() => {
    applyPreference(preference);
  }, [applyPreference, preference]);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const ratioFromPointer = React.useCallback(
    (axis: WorkbenchAreaResizeAxisV3, clientX: number, clientY: number) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (bounds === undefined || bounds.width <= 0 || bounds.height <= 0) {
        return preferenceRef.current;
      }
      if (axis === "inspector") {
        const minimum = Math.max(0.18, 240 / bounds.width);
        const maximum = Math.min(0.42, (bounds.width - 520) / bounds.width);
        return normalizeWorkbenchAreaLayoutPreferenceV3({
          ...preferenceRef.current,
          inspectorWidthRatio: clampRatio(
            (bounds.right - clientX) / bounds.width,
            Math.min(minimum, maximum),
            Math.max(minimum, maximum),
          ),
        });
      }
      const minimum = Math.max(0.18, 150 / bounds.height);
      const maximum = Math.min(0.45, (bounds.height - 300) / bounds.height);
      return normalizeWorkbenchAreaLayoutPreferenceV3({
        ...preferenceRef.current,
        outputHeightRatio: clampRatio(
          (bounds.bottom - clientY) / bounds.height,
          Math.min(minimum, maximum),
          Math.max(minimum, maximum),
        ),
      });
    },
    [],
  );

  const pointerHandlers = (axis: WorkbenchAreaResizeAxisV3) => ({
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!desktop || event.button !== 0) return;
      dragRef.current = { axis, pointerId: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag?.axis !== axis || drag.pointerId !== event.pointerId) return;
      applyPreference(ratioFromPointer(axis, event.clientX, event.clientY));
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag?.axis !== axis || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      commitPreference(
        ratioFromPointer(axis, event.clientX, event.clientY),
      );
    },
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      applyPreference(preference);
    },
    onDoubleClick: () => {
      commitPreference({
        ...preferenceRef.current,
        ...(axis === "inspector"
          ? {
              inspectorWidthRatio:
                defaultPreference.inspectorWidthRatio,
            }
          : {
              outputHeightRatio:
                defaultPreference.outputHeightRatio,
            }),
      });
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      let delta = event.shiftKey ? 0.05 : 0.02;
      if (axis === "inspector") {
        if (event.key === "ArrowRight") delta *= -1;
        else if (event.key !== "ArrowLeft") return;
        event.preventDefault();
        commitPreference({
          ...preferenceRef.current,
          inspectorWidthRatio:
            preferenceRef.current.inspectorWidthRatio + delta,
        });
        return;
      }
      if (event.key === "ArrowDown") delta *= -1;
      else if (event.key !== "ArrowUp") return;
      event.preventDefault();
      commitPreference({
        ...preferenceRef.current,
        outputHeightRatio: preferenceRef.current.outputHeightRatio + delta,
      });
    },
  });

  const desktopStyle = desktop
    ? ({
        "--wb-inspector-size": `${preference.inspectorWidthRatio * 100}%`,
        "--wb-output-size": `${preference.outputHeightRatio * 100}%`,
        gridTemplateColumns: "minmax(0, 1fr) var(--wb-inspector-size)",
        gridTemplateRows: "minmax(0, 1fr) var(--wb-output-size)",
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative grid ${className}`}
      style={desktopStyle}
      data-testid="workbench-area-layout"
    >
      {children}
      <div
        role="separator"
        aria-label={inspectorResizeLabel}
        aria-orientation="vertical"
        aria-valuemin={18}
        aria-valuemax={42}
        aria-valuenow={Math.round(preference.inspectorWidthRatio * 100)}
        tabIndex={0}
        className="group absolute bottom-0 right-[calc(var(--wb-inspector-size)-5px)] top-0 z-40 hidden w-[10px] cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none lg:flex"
        data-testid="workbench-inspector-resize-handle"
        {...pointerHandlers("inspector")}
      >
        <span className="w-px bg-wb-line transition-colors group-hover:bg-wb-accent group-focus-visible:bg-wb-accent" />
      </div>
      <div
        role="separator"
        aria-label={outputResizeLabel}
        aria-orientation="horizontal"
        aria-valuemin={18}
        aria-valuemax={45}
        aria-valuenow={Math.round(preference.outputHeightRatio * 100)}
        tabIndex={0}
        className="group absolute bottom-[calc(var(--wb-output-size)-5px)] left-0 right-[var(--wb-inspector-size)] z-40 hidden h-[10px] cursor-row-resize touch-none flex-col items-stretch justify-center focus-visible:outline-none lg:flex"
        data-testid="workbench-output-resize-handle"
        {...pointerHandlers("outputs")}
      >
        <span className="h-px bg-wb-line transition-colors group-hover:bg-wb-accent group-focus-visible:bg-wb-accent" />
      </div>
    </div>
  );
}
