import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { StudioArticleDraftV2 } from "../studio/contracts/v2/article";
import type { ExperimentSnapshotV2, ScenarioCaptureV2 } from "../studio/contracts/v2/content";

const baseline = JSON.parse(readFileSync(new URL(
  "../data/model-baselines/standard74-baseline-v1.json", import.meta.url,
), "utf8")) as { modelId: string; surfaceReleaseId: string; capture: ScenarioCaptureV2 };

async function openColdPeek(page: Page, search = "") {
  const snapshot: ExperimentSnapshotV2 = {
    schemaId: "circleheart-studio-experiment-snapshot-v2",
    snapshotId: "snapshot-reader-peek-test", createdAt: "2026-09-13T00:00:00.000Z",
    surfaceReleaseId: baseline.surfaceReleaseId,
    content: {
      modelId: baseline.modelId,
      surfaceSeriesId: "circleheart.main-wire.surface.static-anatomy.bounded-pva-workbench",
      scenarios: [{ scenarioId: "baseline", label: "基準", capture: baseline.capture }],
      surface: {
        // Two equally important waveforms require Peek, with a real exact Worker.
        graphPanes: ["LVP", "AoP"].map((seriesId, order) => ({
          paneId: `wave-${seriesId}`, role: "graph", label: seriesId,
          order, priority: 1, graphId: "hemodynamics.pressure.waveform.comprehensive-v1",
          scenarioScope: { mode: "visible-scenarios" }, excludedTraces: [], windowSec: 2,
          axisRanges: { y: { minimum: -5, maximum: 140 } },
          series: [{ seriesId, label: seriesId, order: 0 }],
        })),
        outputPanes: [], controlPanes: [], note: { text: "" },
      },
    },
  };
  const article: StudioArticleDraftV2 = {
    schemaId: "circleheart-studio-article-draft-v2", articleId: "article-reader-peek-test",
    draftVersion: 1, visibility: "draft", locale: "ja", title: "二つの圧波形を読む",
    blocks: [{
      blockId: "experiment", kind: "experiment",
      placement: {
        schemaId: "circleheart-studio-experiment-placement-v2",
        placementId: "peek-test", snapshotId: snapshot.snapshotId, caption: null, titleOverride: null,
        briefing: {
          defaultTitle: "左室圧と大動脈圧",
          scenarioScope: { visibleScenarioIds: ["baseline"], initialFocusScenarioId: "baseline" },
          graphs: snapshot.content.surface.graphPanes.map(({ paneId, order }) => ({ paneId, order, emphasis: "primary" })),
          outputs: [], controls: [],
        },
      },
    }],
  };
  await page.addInitScript((envelope: string) => {
    localStorage.setItem("circleheart.studio.browser-content.v9", envelope);
  }, JSON.stringify({
    schemaId: "circleheart-studio-browser-content-v9", experiments: [], snapshots: [snapshot], articles: [article],
  }));
  await page.route("**/rest/v1/rpc/read_article_v1", route => route.fulfill({ json: article }));
  await page.route("**/rest/v1/rpc/read_experiment_snapshot_v1", route => route.fulfill({ json: snapshot }));
  await page.goto(`/ja/articles/${article.articleId}/preview${search}`);
  const placement = page.locator('[data-reader-placement-id="peek-test"]');
  await expect(placement).toHaveAttribute("data-reader-presentation", "peek");
  await expect(placement).toHaveAttribute("data-reader-placement-live", "false");
  await expect(page.getByTestId("article-reader-experiment-peek-v3")).toHaveCount(0);
  await placement.getByRole("button").click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await expect(panel).toBeVisible();
  await expect(placement).toHaveAttribute("data-reader-placement-live", "true");
  await expect(panel.locator("[data-reader-runtime-status]")).toHaveAttribute("data-reader-runtime-status", "playing");
  await expect(panel.getByTestId("v3-playback-rate-trigger")).toHaveText("1×");
  // The stage paints one sealed view at a time; the second waveform is one rail tab away.
  await expect(panel.locator('[data-chart-kind="sweeping-waveform-v3"]')).toHaveCount(1);
  await expect(panel.getByTestId("article-reader-stage-rail-v3").getByRole("tab")).toHaveCount(2);
  for (const canvas of await panel.locator('[data-chart-kind="sweeping-waveform-v3"] canvas').all()) {
    await expect(canvas).toHaveAttribute("data-y-minimum", "-5");
    await expect(canvas).toHaveAttribute("data-y-maximum", "140");
  }
  return { placement, panel };
}

test("@desktop @mobile @webkit cold Peek starts at 1x and retires on close", async ({ page }) => {
  const { placement, panel } = await openColdPeek(page);
  const canvas = panel.locator("canvas").first();
  const initialFrame = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).not.toBe(initialFrame);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(placement).toHaveAttribute("data-reader-placement-live", "false");
  await expect(placement.getByRole("button")).toBeFocused();
});

test("@desktop @mobile @webkit Peek speed settings support keyboard navigation and nested Escape", async ({ page }) => {
  const { panel } = await openColdPeek(page);
  const trigger = panel.getByTestId("v3-playback-rate-trigger");
  await trigger.focus();
  await page.keyboard.press("Enter");
  const popover = page.getByTestId("v3-playback-rate-popover");
  const slider = popover.getByRole("slider");
  await expect(slider).toBeFocused();
  if (page.viewportSize()!.width < 640) {
    await expect(panel.getByTestId("v3-playback-rate-popover")).toBeVisible();
  }
  expect(await slider.evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
      && document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === el;
  })).toBe(true);
  await page.keyboard.press("ArrowLeft");
  await expect(panel.locator("[data-reader-playback-rate]")).toHaveAttribute("data-reader-playback-rate", "0.75");
  const presets = popover.getByRole("button", { name: /×/ }).and(popover.locator("button:enabled"));
  await presets.last().focus();
  await page.keyboard.press("Tab");
  await expect(popover.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(presets.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(panel).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await popover.getByRole("button", { name: "0.5×", exact: true }).click();
  await expect(trigger).toHaveText("0.5×");
  if (page.viewportSize()!.width < 640) {
    await page.getByTestId("v3-playback-rate-backdrop").click({ position: { x: 20, y: 20 } });
  } else {
    await trigger.click();
  }
  await expect(popover).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});

test("@desktop @mobile Workbench Back restores the article placement and query string", async ({ page }) => {
  const { panel } = await openColdPeek(page, "?from=reading");
  await panel.getByRole("button", { name: "その他の操作" }).click();
  await panel.getByRole("button", { name: "Workbenchで編集" }).click();
  const workbench = page.getByTestId("v3-dockview-workbench");
  await expect(workbench).toHaveAttribute("data-model-id", baseline.modelId);
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja\/articles\/article-reader-peek-test\/preview\?from=reading#placement-peek-test$/);
  await expect(page.locator('[id="placement-peek-test"]')).toBeInViewport();
});
