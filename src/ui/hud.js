import { DEBRIS_MODES } from "../config.js";
import { LEVELS } from "../levels.js";
import { dom } from "./dom.js";
import { gameStore } from "../core/store.js";
import { currentLevel, trackedSatellite } from "../state.js";
import { soundtrack } from "../audio.js";

export function setAngleValue(angle) {
  const minAngle = Number(dom.angleInput.min);
  const maxAngle = Number(dom.angleInput.max);
  const clamped = Math.min(maxAngle, Math.max(minAngle, angle));
  dom.angleInput.value = String(clamped);
  dom.angleValue.textContent = `${dom.angleInput.value}\u00b0`;
  dom.mobileAngleValue.textContent = `${dom.angleInput.value}\u00b0`;
}

export function clearTrackingAndSetAngle(angle, clearTrackedSatellite) {
  clearTrackedSatellite();
  setAngleValue(angle);
}

function syncSoundtrackHud() {
  const track = soundtrack.currentTrack();
  if (dom.musicTrackValue) {
    dom.musicTrackValue.textContent = track ? track.title : "No Track";
  }

  if (dom.musicToggleButton) {
    dom.musicToggleButton.textContent = soundtrack.muted ? "Music: Off" : "Music: On";
  }

  if (dom.musicStatusValue) {
    let status = "Armed. Music begins on your first interaction.";
    if (soundtrack.muted) {
      status = "Muted. Unmute to resume soundtrack playback.";
    } else if (soundtrack.audio && !soundtrack.audio.paused) {
      status = "Playing.";
    } else if (soundtrack.userUnlocked) {
      status = "Ready.";
    }
    dom.musicStatusValue.textContent = status;
  }
}

export function syncHud() {
  const level = currentLevel();
  const state = gameStore.state;
  dom.levelValue.textContent = level.name;
  dom.hudLevelValue.textContent = level.name;
  dom.mobileLevelValue.textContent = level.name;
  dom.mobileLandscapeLevelValue.textContent = String(gameStore.currentLevelIndex + 1);
  dom.objectiveValue.textContent = level.objective;
  dom.rocketsValue.textContent = String(state.rocketsRemaining);
  dom.mobileRocketsValue.textContent = String(state.rocketsRemaining);
  dom.mobileLandscapeRocketsValue.textContent = String(state.rocketsRemaining);
  dom.destroyedValue.textContent = String(state.destroyedCount);
  dom.chainsValue.textContent = String(state.totalChains);
  dom.scoreValue.textContent = String(state.score);

  const statusText = state.runEnded
    ? state.sectorCleared
      ? gameStore.currentLevelIndex === LEVELS.length - 1
        ? "Campaign Complete"
        : "Sector Clear"
      : "Run Over"
    : state.paused
      ? "Paused"
      : state.debris.length > 0
        ? "Debris Swarm"
        : state.rockets.length > 0
          ? "Missile Live"
          : "Tracking";
  dom.statusValue.textContent = statusText;

  dom.angleValue.textContent = `${dom.angleInput.value}\u00b0`;
  dom.mobileAngleValue.textContent = `${dom.angleInput.value}\u00b0`;
  dom.simulationSpeedValue.textContent = `${Number(dom.simulationSpeedInput.value).toFixed(2)}\u00d7`;

  const pauseText = state.paused ? "Resume Orbit" : "Pause Orbit";
  dom.pauseButton.textContent = pauseText;
  dom.mobilePauseButton.textContent = state.paused ? "▶️" : "⏸";
  dom.debrisModeButton.textContent =
    gameStore.debrisMode === DEBRIS_MODES.classic
      ? "Debris Mode: Classic"
      : "Debris Mode: Ordered";

  const pauseDisabled = state.runEnded || state.rockets.length > 0;
  dom.pauseButton.disabled = pauseDisabled;
  dom.mobilePauseButton.disabled = pauseDisabled;

  const fireDisabled =
    state.runEnded ||
    state.rocketsRemaining <= 0 ||
    state.rockets.length > 0 ||
    state.launchCooldown > 0;
  dom.fireButton.disabled = fireDisabled;
  dom.mobileFireButton.disabled = fireDisabled;
  dom.mobileResetButton.disabled = false;

  const angleButtonsDisabled = state.runEnded || state.rockets.length > 0 || state.launchCooldown > 0;
  dom.mobileAngleDecrease.disabled = angleButtonsDisabled;
  dom.mobileAngleIncrease.disabled = angleButtonsDisabled;
  dom.stopTrackingButton.disabled = !trackedSatellite();
  dom.nextLevelButton.disabled = gameStore.currentLevelIndex === LEVELS.length - 1;

  syncSoundtrackHud();
}
