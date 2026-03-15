import {
  CONFIG,
  LANDSCAPE_LAUNCH_MARGIN,
  LANDSCAPE_SCENE_OVERFLOW_Y,
  LANDSCAPE_SCENE_WIDTH_RATIO,
  LANDSCAPE_VISIBLE_MARGIN,
} from "../config.js";
import { dom } from "./dom.js";
import { landscapeSceneBounds, isMobileLandscapeView, viewportSize } from "../core/entities.js";
import { currentLevel } from "../state.js";

let viewportRefreshRaf = 0;
let viewportRefreshTimeout = 0;
let viewportRefreshSettledTimeout = 0;

export function updateViewportCssVars() {
  const { width: viewportWidth, height: viewportHeight } = viewportSize();
  dom.rootStyle.setProperty("--app-height", `${viewportHeight}px`);
  dom.rootStyle.setProperty("--app-width", `${viewportWidth}px`);

  if (!isMobileLandscapeView()) {
    dom.rootStyle.setProperty("--mobile-landscape-scene-offset-x", "0px");
    dom.rootStyle.setProperty("--mobile-landscape-scene-offset-y", "0px");
    dom.rootStyle.setProperty("--mobile-hud-bottom", "2px");
    dom.canvas.style.width = "";
    dom.canvas.style.height = "";
    return;
  }

  const topbarRect = dom.mobileLandscapeTopbar?.getBoundingClientRect() || null;
  const controlsRect = dom.mobileLandscapeControls?.getBoundingClientRect() || null;
  const controlsBottomInset = Math.max(
    2,
    Math.round(controlsRect ? viewportHeight - controlsRect.bottom : 2),
  );
  const topMargin = Math.max(
    LANDSCAPE_VISIBLE_MARGIN,
    Math.round(topbarRect ? topbarRect.bottom + 6 : LANDSCAPE_VISIBLE_MARGIN),
  );
  const bottomMargin = Math.max(LANDSCAPE_LAUNCH_MARGIN, controlsBottomInset + 8);
  dom.rootStyle.setProperty("--mobile-hud-bottom", `${controlsBottomInset}px`);

  const bounds = landscapeSceneBounds(currentLevel());
  const sceneScale = Math.max(0.1, Math.min(
    (viewportHeight + LANDSCAPE_SCENE_OVERFLOW_Y) / CONFIG.height,
    (viewportWidth * LANDSCAPE_SCENE_WIDTH_RATIO) / CONFIG.width,
    (viewportHeight - bottomMargin - topMargin) / Math.max(1, CONFIG.launchY - bounds.minY),
  ));
  const sceneWidth = Math.round(CONFIG.width * sceneScale);
  const sceneHeight = Math.round(CONFIG.height * sceneScale);
  dom.canvas.style.width = `${sceneWidth}px`;
  dom.canvas.style.height = `${sceneHeight}px`;

  const centeredLeft = (viewportWidth - sceneWidth) / 2;
  const centeredTop = (viewportHeight - sceneHeight) / 2;
  const desiredOffsetX = viewportWidth / 2 - (centeredLeft + bounds.primaryWell.x * sceneScale);
  const minOffsetX = -LANDSCAPE_VISIBLE_MARGIN - (centeredLeft + bounds.minX * sceneScale);
  const maxOffsetX = viewportWidth + LANDSCAPE_VISIBLE_MARGIN - (centeredLeft + bounds.maxX * sceneScale);
  const sceneOffsetX = Math.min(maxOffsetX, Math.max(minOffsetX, Math.min(0, desiredOffsetX)));

  const desiredOffsetY = viewportHeight - bottomMargin - (centeredTop + CONFIG.launchY * sceneScale);
  const minOffsetY = topMargin - (centeredTop + bounds.minY * sceneScale);
  const maxOffsetY = viewportHeight - LANDSCAPE_VISIBLE_MARGIN - (centeredTop + bounds.maxY * sceneScale);
  const sceneOffsetY = Math.min(maxOffsetY, Math.max(minOffsetY, desiredOffsetY));

  dom.rootStyle.setProperty("--mobile-landscape-scene-offset-x", `${Math.round(sceneOffsetX)}px`);
  dom.rootStyle.setProperty("--mobile-landscape-scene-offset-y", `${Math.round(sceneOffsetY)}px`);
}

export function makeViewportScheduler(refreshViewportLayout) {
  return function scheduleViewportRefresh() {
    if (viewportRefreshRaf) {
      cancelAnimationFrame(viewportRefreshRaf);
    }
    if (viewportRefreshTimeout) {
      clearTimeout(viewportRefreshTimeout);
    }
    if (viewportRefreshSettledTimeout) {
      clearTimeout(viewportRefreshSettledTimeout);
    }

    let framesRemaining = 8;
    const runRefresh = () => {
      refreshViewportLayout();
      framesRemaining -= 1;
      if (framesRemaining > 0) {
        viewportRefreshRaf = requestAnimationFrame(runRefresh);
      } else {
        viewportRefreshRaf = 0;
      }
    };

    viewportRefreshRaf = requestAnimationFrame(runRefresh);
    viewportRefreshTimeout = window.setTimeout(() => {
      refreshViewportLayout();
      viewportRefreshTimeout = 0;
    }, 450);
    viewportRefreshSettledTimeout = window.setTimeout(() => {
      refreshViewportLayout();
      viewportRefreshSettledTimeout = 0;
    }, 900);
  };
}
