import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { outputColorV3 } from '@/components/workbench/WorkbenchSurfaceV3';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('application theme', () => {
  it('reads and writes only the current application theme key', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.stubGlobal('document', { body: { dataset: {} } });

    const theme = await import('@/appTheme');
    expect(theme.APP_THEME_STORAGE_KEY).toBe('circleheart.app.theme');
    expect(theme.getStoredAppTheme()).toBe('dark');
    theme.setAppTheme('light');

    expect(values.get(theme.APP_THEME_STORAGE_KEY)).toBe('light');
    expect((document.body.dataset as Record<string, string>).appTheme).toBe('light');
  });

  it('applies the current application dataset before the first paint', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain('document.body.dataset.appTheme');
    expect(html).not.toContain('document.body.dataset.workbenchTheme');
  });

  it('keeps workspace, tool plane, and floating overlay roles semantic', () => {
    const css = readFileSync('index.css', 'utf8');

    expect(css).toContain('--wb-workspace-bg: #0a141d;');
    expect(css).toContain('--wb-tool-plane-bg: #121f2b;');
    expect(css).toContain('--wb-overlay-bg: #182634;');
    expect(css).toContain('--wb-workspace-bg: #ffffff;');
    expect(css).toContain('--wb-tool-plane-bg: #fafafd;');
    expect(css).toContain('--wb-overlay-bg: #ffffff;');
    expect(css).toContain('--wb-canvas-bg: var(--wb-workspace-bg);');
    expect(css).toContain('--wb-chrome-bg: var(--wb-tool-plane-bg);');
    expect(css).toContain('--wb-inspector-bg: var(--wb-tool-plane-bg);');
    expect(css).toContain('--wb-floating-bg: var(--wb-overlay-bg);');
    expect(css).toContain('--wb-tab-strip-bg: var(--wb-tool-plane-bg);');
    expect(css).toContain('--wb-border: #f0f1f2;');
    expect(css).toContain('--wb-zone-main-bg: var(--wb-canvas-bg);');
    expect(css).toContain('--wb-zone-aux-bg: var(--wb-inspector-bg);');
    expect(css).toContain('--wb-accent: #3d9df0;');
    expect(css).toContain('--wb-accent: #0069cc;');
    expect(css).toContain('--wb-line: var(--wb-border);');
    expect(css).toContain('--wb-grid: rgba(37, 55, 72, 0.13);');
    expect(css).toContain('--wb-type-label: 0.75rem;');
    expect(css).toContain('--wb-type-value: var(--wb-type-title);');
    expect(css).toContain('--wb-weight-label: 450;');
    expect(css).toContain('--wb-weight-emphasis: 500;');
    expect(css).toContain('box-shadow: var(--wb-shadow-canvas-recess);');
    expect(css).toContain('box-shadow: var(--wb-shadow-floating);');
    expect(css).not.toContain('box-shadow: var(--wb-shadow-drawer');
    expect(css).not.toContain('--wb-chrome-bg: #15222f;');
    expect(css).not.toContain('--wb-inspector-bg: #101c28;');
  });

  it('uses the same semantic grid and axis tokens in every Canvas renderer', () => {
    const sources = [
      'components/workbench/presentation/SweepingWaveformCanvasV3.tsx',
      'components/workbench/presentation/PressureVolumeLoopCanvasV3.tsx',
      'components/workbench/presentation/GuytonStarlingOrientationCanvasV3.tsx',
    ].map((path) => readFileSync(path, 'utf8'));

    sources.forEach((source) => {
      expect(source).toContain('["--wb-grid"');
      expect(source).toContain('["--wb-axis"');
      expect(source).not.toContain('["--wb-border"');
      expect(source).not.toContain('["--wb-border-strong"');
    });
  });

  it('shares Canvas, inspector, and floating roles across Session and Article projections', () => {
    const pane = readFileSync(
      'components/workbench/ExperimentPanePresentationV3.tsx',
      'utf8',
    );
    const placement = readFileSync(
      'components/article/ArticleExperimentPlacementV3.tsx',
      'utf8',
    );
    const reader = readFileSync(
      'components/article/reader/ArticleReaderExperimentV3.tsx',
      'utf8',
    );
    // Reading layouts: the maximized controls column plays the inspector role.
    const embed = readFileSync(
      'components/article/reader/ArticleReaderEmbedV3.tsx',
      'utf8',
    );

    expect(pane).toContain('bg-wb-canvas');
    expect(placement).toContain('bg-wb-inspector');
    expect(reader).toContain('bg-wb-floating');
    expect(embed).toContain('bg-wb-inspector');
  });

  it('keeps subtle small text above the WCAG AA contrast threshold', () => {
    const css = readFileSync('index.css', 'utf8');
    const themePairs = [
      {
        foreground: '#8494a1',
        backgrounds: ['#0a141d', '#121f2b', '#182634', '#1c2a38'],
      },
      {
        foreground: '#6d6d6d',
        backgrounds: ['#ffffff', '#fafafd', '#f1f1f3'],
      },
    ] as const;

    themePairs.forEach(({ foreground, backgrounds }) => {
      expect(css).toContain(`--wb-text-subtle: ${foreground};`);
      backgrounds.forEach((background) => {
        expect(
          contrastRatio(foreground, background),
          `${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('keeps every tool region on one plane above the graph workspace', () => {
    const workbench = readFileSync('components/workbench/WorkbenchSession.tsx', 'utf8');
    const scenarios = readFileSync(
      'components/workbench/WorkbenchScenarioManagerV3.tsx',
      'utf8',
    );

    expect(workbench).toContain('workbench-workspace');
    expect(workbench).toContain('workbench-bottom-drawer');
    expect(workbench).toContain('workbench-right-drawer');
    expect(scenarios).toContain('workbench-floating-surface');
    expect(scenarios).toContain('overflow-hidden bg-transparent text-wb-text');
  });

  it('uses semantic default series colors legible on both application canvases', () => {
    const outputIds = [
      'hemodynamics.volume.LA',
      'hemodynamics.volume.LV',
      'hemodynamics.volume.RA',
      'hemodynamics.volume.RV',
      'hemodynamics.pressure.absolute.LA',
      'hemodynamics.pressure.absolute.LV',
      'hemodynamics.pressure.absolute.RA',
      'hemodynamics.pressure.absolute.RV',
      'hemodynamics.pressure.transmural.LA',
      'hemodynamics.pressure.transmural.LV',
      'hemodynamics.pressure.transmural.RA',
      'hemodynamics.pressure.transmural.RV',
      'hemodynamics.pressure.absolute.Ao',
      'hemodynamics.pressure.absolute.SA',
      'hemodynamics.pressure.absolute.PA',
      'hemodynamics.pressure.absolute.PVein',
      'hemodynamics.pressure.absolute.VC',
      'hemodynamics.flow.valve.MV',
      'hemodynamics.flow.valve.AoV',
      'hemodynamics.flow.valve.TV',
      'hemodynamics.flow.valve.PV',
      'coronary.flow.total',
      'coronary.flow.inlet.LAD',
      'coronary.flow.inlet.LCx',
      'coronary.flow.inlet.RCA',
      'device.LVAD.flow',
      'rhythm.phase.regular-sinus',
      'future.output.uses-deterministic-fallback',
    ] as const;
    const backgrounds = ['#0a141d', '#ffffff'] as const;

    outputIds.forEach((outputId) => {
      const color = outputColorV3(outputId);
      backgrounds.forEach((background) => {
        expect(
          contrastRatio(color, background),
          `${outputId} ${color} on ${background}`,
        ).toBeGreaterThanOrEqual(3);
      });
    });

    expect(outputColorV3('coronary.flow.total')).toBe('#66717b');
    expect(outputColorV3('hemodynamics.pressure.absolute.LV')).toBe('#cf405a');
    expect(outputColorV3('hemodynamics.pressure.absolute.RV')).toBe('#3472c4');
  });

});

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = color.match(/[0-9a-f]{2}/gi)?.map((channel) =>
    Number.parseInt(channel, 16) / 255);
  if (channels === undefined || channels.length !== 3) {
    throw new Error(`Expected canonical six-digit hex, received ${color}`);
  }
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]!) + (0.7152 * linear[1]!) + (0.0722 * linear[2]!);
}
