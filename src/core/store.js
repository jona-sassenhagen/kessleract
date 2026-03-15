import { DEBRIS_MODES } from "../config.js";

export const gameStore = {
  nextBodyId: 0,
  currentLevelIndex: 0,
  debrisMode: DEBRIS_MODES.classic,
  state: null,
  lastFrame: performance.now(),
  activeCanvasPointer: null,
};

export function allocateBodyId(prefix) {
  const id = `${prefix}-${gameStore.nextBodyId}`;
  gameStore.nextBodyId += 1;
  return id;
}

export function resetBodyIds() {
  gameStore.nextBodyId = 0;
}
