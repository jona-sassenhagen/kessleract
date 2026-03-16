function requireElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required DOM element: #${id}`);
  }
  return element;
}

export const dom = {
  startScreen: requireElement("start-screen"),
  startButton: requireElement("start-button"),
  canvas: requireElement("game"),
  angleInput: requireElement("angle"),
  angleValue: requireElement("angle-value"),
  simulationSpeedInput: requireElement("simulation-speed"),
  simulationSpeedValue: requireElement("simulation-speed-value"),
  pauseButton: requireElement("pause-button"),
  fireButton: requireElement("fire-button"),
  mobilePauseButton: requireElement("mobile-pause-button"),
  mobileFireButton: requireElement("mobile-fire-button"),
  mobileResetButton: requireElement("mobile-reset-button"),
  mobileAngleDecrease: requireElement("mobile-angle-decrease"),
  mobileAngleIncrease: requireElement("mobile-angle-increase"),
  debrisModeButton: requireElement("debris-mode-button"),
  musicToggleButton: requireElement("music-toggle-button"),
  musicNextButton: requireElement("music-next-button"),
  stopTrackingButton: requireElement("stop-tracking-button"),
  restartButton: requireElement("restart-button"),
  nextLevelButton: requireElement("next-level-button"),
  mobileAngleValue: requireElement("mobile-angle-value"),
  levelValue: requireElement("level-value"),
  hudLevelValue: requireElement("hud-level-value"),
  mobileLevelValue: requireElement("mobile-level-value"),
  mobileLandscapeLevelValue: requireElement("mobile-landscape-level-value"),
  objectiveValue: requireElement("objective-value"),
  rocketsValue: requireElement("rockets-value"),
  mobileRocketsValue: requireElement("mobile-rockets-value"),
  mobileLandscapeRocketsValue: requireElement("mobile-landscape-rockets-value"),
  destroyedValue: requireElement("destroyed-value"),
  chainsValue: requireElement("chains-value"),
  scoreValue: requireElement("score-value"),
  statusValue: requireElement("status-value"),
  musicTrackValue: requireElement("music-track-value"),
  musicStatusValue: requireElement("music-status-value"),
  rootStyle: document.documentElement.style,
  mobileLandscapeTopbar: document.querySelector(".mobile-landscape-topbar"),
  mobileLandscapeControls: document.querySelector(".mobile-landscape-controls"),
};

dom.ctx = dom.canvas.getContext("2d");

dom.canvas.width = 1280;
dom.canvas.height = 800;
