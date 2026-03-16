import { dom } from "./ui/dom.js";
import { soundtrack } from "./audio.js";
import { gameStore } from "./core/store.js";
import {
  advanceLevel as advanceLevelState,
  clearTrackedSatellite,
  initializeState,
  restartRun as restartRunState,
} from "./state.js";
import {
  fireRocket as fireRocketAction,
  refreshPrediction,
  satelliteAtPoint,
  updateAutoTracking,
  updateGame,
} from "./sim.js";
import {
  clearHoveredSatellite,
  render,
} from "./render.js";
import {
  clearTrackingAndSetAngle,
  setAngleValue,
  syncHud,
} from "./ui/hud.js";
import { bindInputs } from "./ui/input.js";
import {
  makeViewportScheduler,
  updateViewportCssVars,
} from "./ui/viewport.js";

function refreshViewportLayout() {
  updateViewportCssVars();
  refreshPrediction();
  syncHud();
  render();
}

const scheduleViewportRefresh = makeViewportScheduler(refreshViewportLayout);

function restartRun() {
  restartRunState();
  refreshPrediction();
  syncHud();
  scheduleViewportRefresh();
}

function advanceLevel() {
  const advanced = advanceLevelState();
  if (!advanced) {
    return;
  }
  refreshPrediction();
  syncHud();
  scheduleViewportRefresh();
}

function togglePause() {
  const state = gameStore.state;
  if (state.runEnded || state.rockets.length > 0) {
    return;
  }
  state.paused = !state.paused;
  refreshPrediction();
  syncHud();
}

function trackSatelliteAtPoint(pointer) {
  const satellite = satelliteAtPoint(pointer);
  if (!satellite) {
    return false;
  }
  gameStore.state.trackedSatelliteId = satellite.id;
  updateAutoTracking(setAngleValue);
  refreshPrediction();
  syncHud();
  return true;
}

function fireRocket() {
  fireRocketAction();
  syncHud();
}

function startGame() {
  if (dom.startScreen.hidden) {
    return;
  }
  dom.startScreen.hidden = true;
  soundtrack.ensurePlayback();
  scheduleViewportRefresh();
  syncHud();
  render();
}

function frame(now) {
  const elapsed = Math.min(0.033, (now - gameStore.lastFrame) / 1000);
  gameStore.lastFrame = now;
  if (!dom.startScreen.hidden) {
    render();
    requestAnimationFrame(frame);
    return;
  }
  updateGame(elapsed * Number(dom.simulationSpeedInput.value));
  updateAutoTracking(setAngleValue);
  refreshPrediction();
  syncHud();
  render();
  requestAnimationFrame(frame);
}

initializeState();
soundtrack.init();
soundtrack.onTrackChange = () => {
  syncHud();
};
soundtrack.onMuteChange = () => {
  syncHud();
};
soundtrack.onReadyChange = () => {
  syncHud();
};
setAngleValue(Number(dom.angleInput.value));
refreshPrediction();
syncHud();
updateViewportCssVars();
render();

bindInputs({
  advanceLevel,
  clearTrackedSatellite,
  clearTrackingAndSetAngle: (angle) => clearTrackingAndSetAngle(angle, clearTrackedSatellite),
  fireRocket,
  refreshPrediction,
  restartRun,
  scheduleViewportRefresh,
  setAngleValue,
  startGame,
  syncHud,
  togglePause,
  trackSatelliteAtPoint,
});

clearHoveredSatellite();
requestAnimationFrame(frame);
