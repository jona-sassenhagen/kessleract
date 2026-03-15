import { LEVELS } from "./levels.js";
import { gameStore, resetBodyIds } from "./core/store.js";
import { createSatellite, normalizeLevelWells } from "./core/entities.js";

export function currentLevel() {
  return LEVELS[gameStore.currentLevelIndex];
}

export function initialState(levelIndex = gameStore.currentLevelIndex) {
  gameStore.currentLevelIndex = levelIndex;
  const level = currentLevel();
  const { physicalWells, visualWells } = normalizeLevelWells(level.wells);
  return {
    time: 0,
    rocketsRemaining: level.rocketBudget,
    rocketsFired: 0,
    launchCooldown: 0,
    destroyedCount: 0,
    totalChains: 0,
    score: 0,
    runEnded: false,
    sectorCleared: false,
    paused: false,
    wells: physicalWells,
    wellVisuals: visualWells,
    satellites: level.satellites.map((satellite) => createSatellite(satellite, physicalWells)),
    rockets: [],
    debris: [],
    explosions: [],
    preview: null,
    hoveredSatelliteId: null,
    trackedSatelliteId: null,
  };
}

export function initializeState() {
  resetBodyIds();
  gameStore.state = initialState();
}

export function loadLevel(levelIndex) {
  resetBodyIds();
  gameStore.state = initialState(levelIndex);
}

export function restartRun() {
  loadLevel(gameStore.currentLevelIndex);
}

export function advanceLevel() {
  if (gameStore.currentLevelIndex >= LEVELS.length - 1) {
    return false;
  }
  loadLevel(gameStore.currentLevelIndex + 1);
  return true;
}

export function canAdvanceFromRunEnd() {
  return (
    gameStore.state.runEnded &&
    gameStore.state.sectorCleared &&
    gameStore.currentLevelIndex < LEVELS.length - 1
  );
}

export function clearTrackedSatellite() {
  gameStore.state.trackedSatelliteId = null;
}

export function trackedSatellite() {
  if (!gameStore.state.trackedSatelliteId) {
    return null;
  }
  const satellite = gameStore.state.satellites.find(
    (candidate) => candidate.id === gameStore.state.trackedSatelliteId,
  );
  if (!satellite || satellite.destroyed) {
    clearTrackedSatellite();
    return null;
  }
  return satellite;
}
