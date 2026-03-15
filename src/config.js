export const POINTER_TAP_SLOP = 18;
export const MOBILE_VIEW_MAX_WIDTH = 960;
export const LANDSCAPE_SCENE_OVERFLOW_Y = 72;
export const LANDSCAPE_SCENE_WIDTH_RATIO = 0.95;
export const LANDSCAPE_VISIBLE_MARGIN = 8;
export const LANDSCAPE_LAUNCH_MARGIN = 18;

export const CONFIG = {
  width: 1280,
  height: 800,
  dt: 1 / 60,
  previewDt: 1 / 45,
  previewHorizon: 18,
  orbitGuideHorizon: 8.5,
  ballisticGuideHorizon: 30,
  launchX: 60,
  launchY: 800 - 42,
  rocketSpeed: 520,
  rocketRadius: 5,
  rocketTrailLength: 132,
  debrisRadius: 4,
  maxDebris: 40,
  debrisTrailLength: 160,
  debrisTimeScale: 1.6,
  explosionDuration: 0.65,
  collisionRadius: 18,
  scorePerSatellite: 120,
  scoreRocketPenalty: 30,
  scoreChainBonus: 55,
  launchCooldown: 0.24,
  worldPadding: 320,
  previewMaxGeneration: 1,
  satelliteTrailLength: 80,
  debrisCaptureInset: 12,
  debrisMinCaptureRadius: 18,
};

export const ORBIT_FAMILIES = {
  inner: { color: "#6fd3ff", guideColor: "rgba(111, 211, 255, 0.36)" },
  transfer: { color: "#ffd166", guideColor: "rgba(255, 209, 102, 0.34)" },
  relay: { color: "#ff8fab", guideColor: "rgba(255, 143, 171, 0.34)" },
  sweep: { color: "#9dffad", guideColor: "rgba(157, 255, 173, 0.34)" },
  outer: { color: "#c5b3ff", guideColor: "rgba(197, 179, 255, 0.34)" },
  polar: { color: "#8edce6", guideColor: "rgba(142, 220, 230, 0.34)" },
  lunar: { color: "#ffe9a8", guideColor: "rgba(255, 233, 168, 0.34)" },
  lunarRelay: { color: "#b0f0ff", guideColor: "rgba(176, 240, 255, 0.34)" },
  lunarOuter: { color: "#ffb4a2", guideColor: "rgba(255, 180, 162, 0.34)" },
  asteroidInner: { color: "#f2d0a9", guideColor: "rgba(242, 208, 169, 0.34)" },
  asteroidSkim: { color: "#ffd6ff", guideColor: "rgba(255, 214, 255, 0.3)" },
  asteroidOuter: { color: "#bde0fe", guideColor: "rgba(189, 224, 254, 0.3)" },
};

export const DEBRIS_MODES = {
  classic: "classic",
  ordered: "ordered",
};
