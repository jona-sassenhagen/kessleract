const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const angleInput = document.getElementById("angle");
const angleValue = document.getElementById("angle-value");
const simulationSpeedInput = document.getElementById("simulation-speed");
const simulationSpeedValue = document.getElementById("simulation-speed-value");
const pauseButton = document.getElementById("pause-button");
const fireButton = document.getElementById("fire-button");
const mobilePauseButton = document.getElementById("mobile-pause-button");
const mobileFireButton = document.getElementById("mobile-fire-button");
const debrisModeButton = document.getElementById("debris-mode-button");
const stopTrackingButton = document.getElementById("stop-tracking-button");
const restartButton = document.getElementById("restart-button");
const nextLevelButton = document.getElementById("next-level-button");
const mobileAngleInput = document.getElementById("mobile-angle");
const mobileAngleValue = document.getElementById("mobile-angle-value");

const levelValue = document.getElementById("level-value");
const hudLevelValue = document.getElementById("hud-level-value");
const mobileLevelValue = document.getElementById("mobile-level-value");
const objectiveValue = document.getElementById("objective-value");
const rocketsValue = document.getElementById("rockets-value");
const mobileRocketsValue = document.getElementById("mobile-rockets-value");
const destroyedValue = document.getElementById("destroyed-value");
const chainsValue = document.getElementById("chains-value");
const scoreValue = document.getElementById("score-value");
const statusValue = document.getElementById("status-value");
const mobileStatusValue = document.getElementById("mobile-status-value");

const POINTER_TAP_SLOP = 18;
let activeCanvasPointer = null;

canvas.width = 1280;
canvas.height = 800;

const CONFIG = {
  width: canvas.width,
  height: canvas.height,
  dt: 1 / 60,
  previewDt: 1 / 45,
  previewHorizon: 18,
  orbitGuideHorizon: 8.5,
  ballisticGuideHorizon: 30,
  launchX: 60,
  launchY: canvas.height - 42,
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

const ORBIT_FAMILIES = {
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

const DEBRIS_MODES = {
  classic: "classic",
  ordered: "ordered",
};

function deg(degrees) {
  return (degrees * Math.PI) / 180;
}

function satelliteSpec(spec) {
  return {
    ...spec,
    rotation: spec.rotation || 0,
    motionMode: spec.motionMode || "orbit",
  };
}

const LEVELS = [
  {
    id: "tutorial-orbit",
    name: "Level 1: Tutorial Orbit",
    objective: "Large satellites are chain fuel. Small ones are cleanup shots.",
    rocketBudget: 4,
    previewHorizon: 16,
    wells: [
      {
        id: "earth",
        x: CONFIG.width * 0.58,
        y: CONFIG.height * 0.48,
        radius: 76,
        mu: 235000,
        core: "#1d3d5d",
        glow: "#4c7ba8",
        ring: "rgba(121, 224, 255, 0.26)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "earth", orbitFamily: "inner", debrisYield: 5, rx: 156, ry: 148, phase: -1.15, rotation: deg(8), angularSpeed: 0.2, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "transfer", debrisYield: 3, rx: 182, ry: 166, phase: -0.38, rotation: deg(62), angularSpeed: 0.17, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "relay", debrisYield: 2, rx: 220, ry: 154, phase: 0.62, rotation: deg(118), angularSpeed: 0.14, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "sweep", debrisYield: 1, rx: 262, ry: 136, phase: 1.78, rotation: deg(164), angularSpeed: 0.12, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "outer", debrisYield: 0, rx: 308, ry: 122, phase: 2.52, rotation: deg(46), angularSpeed: 0.1, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "polar", debrisYield: 2, rx: 212, ry: 162, phase: -2.36, rotation: deg(98), angularSpeed: 0.11, direction: 1 }),
    ],
  },
  {
    id: "tight-window",
    name: "Level 2: Tight Window",
    objective: "Hit the medium and heavy sats when they cross the shared hub.",
    rocketBudget: 3,
    previewHorizon: 17,
    wells: [
      {
        id: "earth",
        x: CONFIG.width * 0.59,
        y: CONFIG.height * 0.5,
        radius: 82,
        mu: 250000,
        core: "#163754",
        glow: "#4f88b5",
        ring: "rgba(121, 224, 255, 0.24)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "earth", orbitFamily: "inner", debrisYield: 5, rx: 150, ry: 144, phase: -1.46, rotation: deg(12), angularSpeed: 0.23, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "transfer", debrisYield: 3, rx: 184, ry: 164, phase: -0.52, rotation: deg(58), angularSpeed: 0.18, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "relay", debrisYield: 2, rx: 234, ry: 150, phase: 0.68, rotation: deg(104), angularSpeed: 0.15, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "sweep", debrisYield: 1, rx: 286, ry: 134, phase: 1.64, rotation: deg(152), angularSpeed: 0.12, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "outer", debrisYield: 0, rx: 336, ry: 114, phase: 2.38, rotation: deg(34), angularSpeed: 0.09, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "polar", debrisYield: 3, rx: 206, ry: 156, phase: -2.26, rotation: deg(88), angularSpeed: 0.14, direction: -1 }),
    ],
  },
  {
    id: "cascade-budget",
    name: "Level 3: Cascade Budget",
    objective: "Spend rockets only on the heaviest chain-makers in the inner lanes.",
    rocketBudget: 2,
    previewHorizon: 18,
    wells: [
      {
        id: "earth",
        x: CONFIG.width * 0.56,
        y: CONFIG.height * 0.52,
        radius: 88,
        mu: 265000,
        core: "#112e48",
        glow: "#406d93",
        ring: "rgba(121, 224, 255, 0.22)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "earth", orbitFamily: "inner", debrisYield: 5, rx: 148, ry: 142, phase: -1.12, rotation: deg(14), angularSpeed: 0.22, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "transfer", debrisYield: 3, rx: 176, ry: 160, phase: -0.18, rotation: deg(52), angularSpeed: 0.18, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "relay", debrisYield: 2, rx: 224, ry: 148, phase: 0.86, rotation: deg(96), angularSpeed: 0.14, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "sweep", debrisYield: 1, rx: 276, ry: 130, phase: 1.84, rotation: deg(142), angularSpeed: 0.11, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "outer", debrisYield: 0, rx: 330, ry: 112, phase: 2.46, rotation: deg(26), angularSpeed: 0.09, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "polar", debrisYield: 2, rx: 214, ry: 150, phase: -2.34, rotation: deg(82), angularSpeed: 0.12, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "transfer", debrisYield: 3, rx: 242, ry: 144, phase: 2.96, rotation: deg(120), angularSpeed: 0.1, direction: -1 }),
    ],
  },
  {
    id: "moon-crossing",
    name: "Level 4: Moon Crossing",
    objective: "Use Earth lanes to seed debris, but you should still have a clean shot at either body.",
    rocketBudget: 3,
    previewHorizon: 20,
    wells: [
      {
        id: "earth",
        x: CONFIG.width * 0.44,
        y: CONFIG.height * 0.36,
        radius: 92,
        mu: 270000,
        core: "#163754",
        glow: "#4f88b5",
        ring: "rgba(121, 224, 255, 0.24)",
      },
      {
        id: "moon",
        x: CONFIG.width * 0.78,
        y: CONFIG.height * 0.66,
        radius: 44,
        mu: 54000,
        core: "#4d5563",
        glow: "#959fb0",
        ring: "rgba(255, 209, 102, 0.22)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "earth", orbitFamily: "inner", debrisYield: 5, rx: 166, ry: 156, phase: -1.26, rotation: deg(10), angularSpeed: 0.19, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "transfer", debrisYield: 3, rx: 212, ry: 170, phase: -0.48, rotation: deg(62), angularSpeed: 0.15, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "relay", debrisYield: 2, rx: 286, ry: 148, phase: 2.28, rotation: deg(120), angularSpeed: 0.11, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "sweep", debrisYield: 1, rx: 244, ry: 124, phase: 1.66, rotation: deg(88), angularSpeed: 0.14, direction: -1 }),
      satelliteSpec({ wellId: "moon", orbitFamily: "lunar", debrisYield: 3, rx: 90, ry: 82, phase: -0.38, rotation: deg(28), angularSpeed: 0.32, direction: 1 }),
      satelliteSpec({ wellId: "moon", orbitFamily: "lunarRelay", debrisYield: 1, rx: 132, ry: 74, phase: 1.72, rotation: deg(112), angularSpeed: 0.24, direction: -1 }),
    ],
  },
  {
    id: "binary-trap",
    name: "Level 5: Binary Trap",
    objective: "Read two hubs at once. Big sats on inner lanes power the whole puzzle.",
    rocketBudget: 3,
    previewHorizon: 20,
    wells: [
      {
        id: "earth",
        x: CONFIG.width * 0.42,
        y: CONFIG.height * 0.58,
        radius: 88,
        mu: 248000,
        core: "#14344f",
        glow: "#507da5",
        ring: "rgba(121, 224, 255, 0.2)",
      },
      {
        id: "moon",
        x: CONFIG.width * 0.74,
        y: CONFIG.height * 0.37,
        radius: 54,
        mu: 76000,
        core: "#5d6775",
        glow: "#b0bac7",
        ring: "rgba(255, 209, 102, 0.2)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "earth", orbitFamily: "inner", debrisYield: 5, rx: 146, ry: 140, phase: -1.18, rotation: deg(12), angularSpeed: 0.22, direction: 1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "transfer", debrisYield: 3, rx: 192, ry: 164, phase: -0.36, rotation: deg(56), angularSpeed: 0.17, direction: -1 }),
      satelliteSpec({ wellId: "earth", orbitFamily: "relay", debrisYield: 2, rx: 258, ry: 146, phase: 2.56, rotation: deg(116), angularSpeed: 0.12, direction: 1 }),
      satelliteSpec({ wellId: "moon", orbitFamily: "lunar", debrisYield: 3, rx: 94, ry: 86, phase: 0.82, rotation: deg(18), angularSpeed: 0.28, direction: 1 }),
      satelliteSpec({ wellId: "moon", orbitFamily: "lunarRelay", debrisYield: 1, rx: 146, ry: 82, phase: -2.2, rotation: deg(78), angularSpeed: 0.2, direction: -1 }),
      satelliteSpec({ wellId: "moon", orbitFamily: "lunarOuter", debrisYield: 0, rx: 188, ry: 66, phase: 2.9, rotation: deg(136), angularSpeed: 0.14, direction: 1 }),
    ],
  },
  {
    id: "dual-planet-lattice",
    name: "Level 6: Dual Planet Lattice",
    objective: "Two planets, two local lanes, plus shared-field satellites that loop around both bodies.",
    rocketBudget: 2,
    previewHorizon: 22,
    wells: [
      {
        kind: "planet",
        id: "tide",
        x: CONFIG.width * 0.34,
        y: CONFIG.height * 0.58,
        radius: 86,
        mu: 238000,
        core: "#17334d",
        glow: "#5885b0",
        ring: "rgba(121, 224, 255, 0.22)",
      },
      {
        kind: "planet",
        id: "forge",
        x: CONFIG.width * 0.72,
        y: CONFIG.height * 0.34,
        radius: 80,
        mu: 225000,
        core: "#40253d",
        glow: "#a66e92",
        ring: "rgba(255, 143, 171, 0.2)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "tide", orbitFamily: "inner", debrisYield: 5, rx: 152, ry: 144, phase: -1.22, rotation: deg(18), angularSpeed: 0.2, direction: 1 }),
      satelliteSpec({ wellId: "tide", orbitFamily: "transfer", debrisYield: 3, rx: 214, ry: 162, phase: -0.42, rotation: deg(54), angularSpeed: 0.15, direction: -1 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "relay", debrisYield: 2, x: CONFIG.width * 0.507, y: CONFIG.height * 0.525, vx: -33, vy: -24 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "sweep", debrisYield: 2, x: CONFIG.width * 0.42, y: CONFIG.height * 0.245, vx: 30, vy: 13 }),
      satelliteSpec({ wellId: "forge", orbitFamily: "sweep", debrisYield: 1, rx: 190, ry: 146, phase: 1.4, rotation: deg(78), angularSpeed: 0.16, direction: -1 }),
      satelliteSpec({ wellId: "forge", orbitFamily: "outer", debrisYield: 5, rx: 250, ry: 150, phase: 2.62, rotation: deg(138), angularSpeed: 0.11, direction: 1 }),
      satelliteSpec({ wellId: "forge", orbitFamily: "polar", debrisYield: 0, rx: 296, ry: 120, phase: -2.18, rotation: deg(170), angularSpeed: 0.09, direction: -1 }),
    ],
  },
  {
    id: "shepherd-moon",
    name: "Level 7: Shepherd Moon",
    objective: "Seed debris from the planet first. The moon is a collector, not the opening shot.",
    rocketBudget: 2,
    previewHorizon: 23,
    wells: [
      {
        kind: "planet",
        id: "giant",
        x: CONFIG.width * 0.48,
        y: CONFIG.height * 0.56,
        radius: 96,
        mu: 286000,
        core: "#18354f",
        glow: "#5f90ba",
        ring: "rgba(121, 224, 255, 0.24)",
      },
      {
        kind: "planet",
        id: "shepherd",
        x: CONFIG.width * 0.8,
        y: CONFIG.height * 0.28,
        radius: 46,
        mu: 62000,
        core: "#636975",
        glow: "#b7c1cc",
        ring: "rgba(255, 233, 168, 0.22)",
      },
    ],
    satellites: [
      satelliteSpec({ wellId: "giant", orbitFamily: "inner", debrisYield: 5, rx: 164, ry: 152, phase: -1.32, rotation: deg(8), angularSpeed: 0.19, direction: 1 }),
      satelliteSpec({ wellId: "giant", orbitFamily: "transfer", debrisYield: 3, rx: 210, ry: 172, phase: -0.3, rotation: deg(52), angularSpeed: 0.15, direction: -1 }),
      satelliteSpec({ wellId: "giant", orbitFamily: "relay", debrisYield: 2, rx: 286, ry: 150, phase: 2.44, rotation: deg(122), angularSpeed: 0.11, direction: 1 }),
      satelliteSpec({ wellId: "giant", orbitFamily: "sweep", debrisYield: 0, rx: 244, ry: 122, phase: 1.66, rotation: deg(90), angularSpeed: 0.13, direction: -1 }),
      satelliteSpec({ wellId: "shepherd", orbitFamily: "lunar", debrisYield: 1, rx: 82, ry: 76, phase: 0.44, rotation: deg(16), angularSpeed: 0.31, direction: 1 }),
      satelliteSpec({ wellId: "shepherd", orbitFamily: "lunarRelay", debrisYield: 3, rx: 128, ry: 72, phase: -2.12, rotation: deg(86), angularSpeed: 0.22, direction: -1 }),
      satelliteSpec({ wellId: "shepherd", orbitFamily: "lunarOuter", debrisYield: 0, rx: 170, ry: 60, phase: 2.82, rotation: deg(132), angularSpeed: 0.16, direction: 1 }),
    ],
  },
  {
    id: "split-mass-asteroid",
    name: "Level 8: Split-Mass Asteroid",
    objective: "The asteroid bends shots toward its heavy lobes. Read the drift, not the silhouette.",
    rocketBudget: 3,
    previewHorizon: 24,
    wells: [
      {
        kind: "composite",
        id: "asteroid",
        x: CONFIG.width * 0.62,
        y: CONFIG.height * 0.46,
        visualRadius: 116,
        core: "#5d5147",
        glow: "#b49a83",
        ring: "rgba(242, 208, 169, 0.18)",
        lobes: [
          { id: "head", x: -34, y: -18, radius: 46, mu: 72000 },
          { id: "belly", x: 28, y: 8, radius: 54, mu: 98000 },
          { id: "tail", x: -8, y: 44, radius: 38, mu: 56000 },
        ],
      },
    ],
    satellites: [
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "asteroidInner", debrisYield: 5, x: CONFIG.width * 0.62 + 138, y: CONFIG.height * 0.46 - 36, vx: 11, vy: 27 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "asteroidSkim", debrisYield: 3, x: CONFIG.width * 0.62 - 164, y: CONFIG.height * 0.46 + 6, vx: -4, vy: -23 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "asteroidOuter", debrisYield: 2, x: CONFIG.width * 0.62 + 64, y: CONFIG.height * 0.46 - 196, vx: 16, vy: 9 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "asteroidSkim", debrisYield: 1, x: CONFIG.width * 0.62 - 44, y: CONFIG.height * 0.46 + 188, vx: -19, vy: -5 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "asteroidOuter", debrisYield: 0, x: CONFIG.width * 0.62 - 224, y: CONFIG.height * 0.46 - 26, vx: 1, vy: -19 }),
      satelliteSpec({ motionMode: "ballistic", orbitFamily: "asteroidInner", debrisYield: 3, x: CONFIG.width * 0.62 + 12, y: CONFIG.height * 0.46 + 212, vx: 18, vy: -2 }),
    ],
  },
];

let nextBodyId = 0;
let currentLevelIndex = 0;
let debrisMode = DEBRIS_MODES.classic;

function currentLevel() {
  return LEVELS[currentLevelIndex];
}

function makePoint(x, y) {
  return { x, y };
}

function magnitude(vector) {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector) {
  const length = magnitude(vector) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function tangentFromRadial(radial, direction) {
  return direction >= 0
    ? { x: -radial.y, y: radial.x }
    : { x: radial.y, y: -radial.x };
}

function rotateVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

function orbitLocalPosition(orbit, theta) {
  return {
    x: Math.cos(theta) * orbit.rx,
    y: Math.sin(theta) * orbit.ry,
  };
}

function orbitLocalVelocity(orbit, theta) {
  const dTheta = orbit.angularSpeed * orbit.direction;
  return {
    x: -Math.sin(theta) * orbit.rx * dTheta,
    y: Math.cos(theta) * orbit.ry * dTheta,
  };
}

function yieldBand(debrisYield) {
  if (debrisYield >= 5) {
    return "large";
  }
  if (debrisYield >= 2) {
    return "medium";
  }
  return "small";
}

function yieldRadius(debrisYield) {
  if (debrisYield >= 5) {
    return 15;
  }
  if (debrisYield >= 2) {
    return 12;
  }
  return 9;
}

function cloneTrail(trail) {
  return trail.map((point) => ({ ...point }));
}

function cloneBody(body) {
  return {
    ...body,
    orbit: body.orbit ? { ...body.orbit } : undefined,
    trail: cloneTrail(body.trail || []),
  };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function getVectorToWell(body, well) {
  return {
    x: well.x - body.x,
    y: well.y - body.y,
  };
}

function getDistanceToWell(body, well) {
  return magnitude(getVectorToWell(body, well));
}

function nearestWell(body, wells = state.wells) {
  let bestWell = wells[0];
  let bestDistance = Infinity;
  for (const well of wells) {
    const distance = getDistanceToWell(body, well);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestWell = well;
    }
  }
  return bestWell;
}

function circularSpeed(radius, well) {
  return Math.sqrt(well.mu / radius);
}

function familyStyle(familyName) {
  return ORBIT_FAMILIES[familyName] || ORBIT_FAMILIES.inner;
}

function normalizeLevelWells(levelWells) {
  const physicalWells = [];
  const visualWells = [];

  for (const sourceWell of levelWells) {
    const kind = sourceWell.kind || "planet";
    if (kind === "composite") {
      visualWells.push({
        ...sourceWell,
        kind,
        lobes: sourceWell.lobes.map((lobe) => ({
          ...lobe,
          x: sourceWell.x + lobe.x,
          y: sourceWell.y + lobe.y,
        })),
      });
      for (const lobe of sourceWell.lobes) {
        physicalWells.push({
          id: `${sourceWell.id}-${lobe.id}`,
          parentId: sourceWell.id,
          kind: "lobe",
          x: sourceWell.x + lobe.x,
          y: sourceWell.y + lobe.y,
          radius: lobe.radius,
          mu: lobe.mu,
          core: sourceWell.core,
          glow: sourceWell.glow,
          ring: sourceWell.ring,
        });
      }
      continue;
    }

    physicalWells.push({ ...sourceWell, kind });
    visualWells.push({ ...sourceWell, kind });
  }

  return { physicalWells, visualWells };
}

function recordTrail(entity, maxPoints) {
  if (!entity.trail) {
    entity.trail = [];
  }
  entity.trail.push(makePoint(entity.x, entity.y));
  if (entity.trail.length > maxPoints) {
    entity.trail.shift();
  }
}

function createSatellite(spec, wells) {
  if (spec.motionMode === "ballistic") {
    const style = familyStyle(spec.orbitFamily);
    return {
      id: `sat-${nextBodyId++}`,
      kind: "satellite",
      motionMode: "ballistic",
      x: spec.x,
      y: spec.y,
      vx: spec.vx,
      vy: spec.vy,
      radius: yieldRadius(spec.debrisYield),
      debrisYield: spec.debrisYield,
      yieldBand: yieldBand(spec.debrisYield),
      orbitFamily: spec.orbitFamily,
      color: style.color,
      guideColor: style.guideColor,
      active: true,
      destroyed: false,
      trail: [makePoint(spec.x, spec.y)],
    };
  }

  const anchor = wells.find((well) => well.id === spec.wellId) || wells[0];
  const theta = spec.phase;
  const orbit = {
    wellId: anchor.id,
    orbitFamily: spec.orbitFamily,
    debrisYield: spec.debrisYield,
    rx: spec.rx,
    ry: spec.ry,
    theta,
    rotation: spec.rotation || 0,
    angularSpeed: spec.angularSpeed,
    direction: spec.direction,
  };
  const localPosition = orbitLocalPosition(orbit, theta);
  const localVelocity = orbitLocalVelocity(orbit, theta);
  const rotatedPosition = rotateVector(localPosition, orbit.rotation);
  const rotatedVelocity = rotateVector(localVelocity, orbit.rotation);
  const style = familyStyle(spec.orbitFamily);

  return {
    id: `sat-${nextBodyId++}`,
    kind: "satellite",
    motionMode: "orbit",
    orbit,
    x: anchor.x + rotatedPosition.x,
    y: anchor.y + rotatedPosition.y,
    vx: rotatedVelocity.x,
    vy: rotatedVelocity.y,
    radius: yieldRadius(spec.debrisYield),
    debrisYield: spec.debrisYield,
    yieldBand: yieldBand(spec.debrisYield),
    orbitFamily: spec.orbitFamily,
    color: style.color,
    guideColor: style.guideColor,
    active: true,
    destroyed: false,
    trail: [makePoint(anchor.x + rotatedPosition.x, anchor.y + rotatedPosition.y)],
  };
}

function createRocket(angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    id: `rocket-${nextBodyId++}`,
    kind: "rocket",
    x: CONFIG.launchX,
    y: CONFIG.launchY,
    vx: Math.cos(angle) * CONFIG.rocketSpeed,
    vy: -Math.sin(angle) * CONFIG.rocketSpeed,
    radius: CONFIG.rocketRadius,
    color: "#79e0ff",
    active: true,
    trail: [makePoint(CONFIG.launchX, CONFIG.launchY)],
  };
}

function createDebrisShard(x, y, vx, vy, depth, generation, color) {
  return {
    id: `debris-${nextBodyId++}`,
    kind: "debris",
    x,
    y,
    vx,
    vy,
    radius: CONFIG.debrisRadius,
    color,
    depth,
    generation,
    age: 0,
    active: true,
    trail: [makePoint(x, y)],
  };
}

function debrisColor(generation) {
  return generation === 1 ? "#ffd166" : generation === 2 ? "#ff9f1c" : "#ff6b6b";
}

function createExplosion(x, y, radius, color) {
  return {
    id: `explosion-${nextBodyId++}`,
    x,
    y,
    radius,
    color,
    age: 0,
    duration: CONFIG.explosionDuration,
    active: true,
  };
}

function prependStartPoint(trail, startPoint) {
  if (!startPoint) {
    return trail;
  }
  if (!trail || trail.length === 0) {
    return [makePoint(startPoint.x, startPoint.y)];
  }
  const first = trail[0];
  if (first.x === startPoint.x && first.y === startPoint.y) {
    return trail;
  }
  return [makePoint(startPoint.x, startPoint.y), ...trail];
}

function initialState(levelIndex = currentLevelIndex) {
  currentLevelIndex = levelIndex;
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

let state = initialState();
let lastFrame = performance.now();

function buildPredictionState(baseState) {
  return {
    time: baseState.time,
    wells: baseState.wells.map((well) => ({ ...well })),
    wellVisuals: baseState.wellVisuals.map((well) => ({
      ...well,
      lobes: well.lobes ? well.lobes.map((lobe) => ({ ...lobe })) : undefined,
    })),
    satellites: baseState.satellites.map(cloneBody),
    rockets: [],
    debris: [],
    explosions: [],
    previewMode: true,
  };
}

function applyGravity(body, dt, wells) {
  for (const well of wells) {
    const toWell = getVectorToWell(body, well);
    const distance = Math.max(magnitude(toWell), well.radius + 8);
    const accelScale = well.mu / (distance * distance * distance);
    body.vx += toWell.x * accelScale * dt;
    body.vy += toWell.y * accelScale * dt;
  }
}

function advanceBody(body, dt, trailLength, wells) {
  applyGravity(body, dt, wells);
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  recordTrail(body, trailLength);
}

function clampSatelliteToViewport(satellite) {
  const margin = 24;
  const minX = margin;
  const maxX = CONFIG.width - margin;
  const minY = margin;
  const maxY = CONFIG.height - margin;

  if (satellite.x < minX || satellite.x > maxX) {
    satellite.x = Math.min(maxX, Math.max(minX, satellite.x));
  }
  if (satellite.y < minY || satellite.y > maxY) {
    satellite.y = Math.min(maxY, Math.max(minY, satellite.y));
  }
}

function updateSatelliteOrbit(satellite, dt, wells) {
  if (satellite.orbit) {
    const anchor = wells.find((well) => well.id === satellite.orbit.wellId) || wells[0];
    satellite.orbit.theta += satellite.orbit.angularSpeed * satellite.orbit.direction * dt;
    const localPosition = orbitLocalPosition(satellite.orbit, satellite.orbit.theta);
    const localVelocity = orbitLocalVelocity(satellite.orbit, satellite.orbit.theta);
    const rotatedPosition = rotateVector(localPosition, satellite.orbit.rotation);
    const rotatedVelocity = rotateVector(localVelocity, satellite.orbit.rotation);
    satellite.x = anchor.x + rotatedPosition.x;
    satellite.y = anchor.y + rotatedPosition.y;
    satellite.vx = rotatedVelocity.x;
    satellite.vy = rotatedVelocity.y;
    recordTrail(satellite, CONFIG.satelliteTrailLength);
    return;
  }

  advanceBody(satellite, dt, CONFIG.satelliteTrailLength, wells);
}

function isOutOfWorld(body) {
  return (
    body.x < -CONFIG.worldPadding ||
    body.x > CONFIG.width + CONFIG.worldPadding ||
    body.y < -CONFIG.worldPadding ||
    body.y > CONFIG.height + CONFIG.worldPadding
  );
}

function isInsideAnyWell(body, wells) {
  return wells.some((well) => {
    const captureRadius =
      body.kind === "debris"
        ? Math.max(CONFIG.debrisMinCaptureRadius, well.radius - CONFIG.debrisCaptureInset) + body.radius
        : well.radius + body.radius;
    return getDistanceToWell(body, well) <= captureRadius;
  });
}

function pruneInactive(array) {
  return array.filter((body) => body.active !== false);
}

function orbitalDirection(body, well) {
  const radial = {
    x: body.x - well.x,
    y: body.y - well.y,
  };
  return radial.x * body.vy - radial.y * body.vx >= 0 ? 1 : -1;
}

function computeClassicDebrisVelocity(
  offset,
  orbitalTangential,
  targetTangential,
  sourceTangential,
  targetRadial,
  sourceRadial,
  baseSpeed,
) {
  const tangentialSpeed =
    orbitalTangential * 0.9 +
    targetTangential * 0.12 +
    sourceTangential * 0.015 +
    offset * 4.2;
  const radialKick =
    targetRadial * 0.035 +
    sourceRadial * 0.01 +
    offset * 1.1;
  const stabilizedTangential =
    tangentialSpeed * 0.92 + orbitalTangential * 0.08;
  const stabilizedRadial = radialKick * 0.55;
  const speed = Math.hypot(stabilizedTangential, stabilizedRadial) || 1;
  const minSpeed = baseSpeed * 0.78;
  const maxSpeed = baseSpeed * 1.08;
  const clampedSpeed = Math.min(maxSpeed, Math.max(minSpeed, speed));
  const speedScale = clampedSpeed / speed;
  return {
    tangential: stabilizedTangential * speedScale,
    radial: stabilizedRadial * speedScale,
  };
}

function spawnDebrisShardWithComponents(
  simulation,
  target,
  tangent,
  radial,
  tangentialSpeed,
  radialSpeed,
  separation,
  depth,
  generation,
) {
  simulation.debris.push(
    createDebrisShard(
      target.x + tangent.x * separation,
      target.y + tangent.y * separation,
      tangent.x * tangentialSpeed + radial.x * radialSpeed,
      tangent.y * tangentialSpeed + radial.y * radialSpeed,
      depth,
      generation,
      debrisColor(generation),
    ),
  );
}

function spawnDebrisFromImpact(target, sourceBody, simulation, depth, generation) {
  if (simulation.previewMode && generation > CONFIG.previewMaxGeneration) {
    return;
  }

  const available = CONFIG.maxDebris - simulation.debris.length;
  if (available <= 0) {
    return;
  }

  const count = Math.min(target.debrisYield || 0, available);
  if (count <= 0) {
    return;
  }

  const anchor = nearestWell(target, simulation.wells);
  const radialVector = {
    x: target.x - anchor.x,
    y: target.y - anchor.y,
  };
  const radial = normalize(radialVector);
  const tangent = tangentFromRadial(radial, orbitalDirection(target, anchor));
  const targetRadius = magnitude(radialVector);
  const baseSpeed = circularSpeed(targetRadius, anchor);
  const targetRadial = target.vx * radial.x + target.vy * radial.y;
  const targetTangential = target.vx * tangent.x + target.vy * tangent.y;
  const sourceRadial = sourceBody.vx * radial.x + sourceBody.vy * radial.y;
  const sourceTangential = sourceBody.vx * tangent.x + sourceBody.vy * tangent.y;
  const targetSpeed = Math.hypot(target.vx, target.vy) || baseSpeed;
  const impactTangential = (targetTangential + sourceTangential) * 0.5;
  const impactRadial = (targetRadial + sourceRadial) * 0.5;

  for (let index = 0; index < count; index += 1) {
    const offset = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
    const orbitalTangential = baseSpeed * orbitalDirection(target, anchor);
    const separation = offset * 10;

    if (debrisMode === DEBRIS_MODES.ordered) {
      if (index === 0) {
        spawnDebrisShardWithComponents(
          simulation,
          target,
          tangent,
          radial,
          targetTangential,
          targetRadial,
          0,
          depth,
          generation,
        );
        continue;
      }

      if (index === 1) {
        const impactSpeed = Math.hypot(impactTangential, impactRadial) || 1;
        const impactClamp = Math.min(baseSpeed * 1.2, Math.max(targetSpeed * 0.7, impactSpeed));
        const impactScale = impactClamp / impactSpeed;
        spawnDebrisShardWithComponents(
          simulation,
          target,
          tangent,
          radial,
          impactTangential * impactScale,
          impactRadial * impactScale,
          separation,
          depth,
          generation,
        );
        continue;
      }
    }

    const classic = computeClassicDebrisVelocity(
      offset,
      orbitalTangential,
      targetTangential,
      sourceTangential,
      targetRadial,
      sourceRadial,
      baseSpeed,
    );
    spawnDebrisShardWithComponents(
      simulation,
      target,
      tangent,
      radial,
      classic.tangential,
      classic.radial,
      separation,
      depth,
      generation,
    );
  }
}

function resolveSatelliteDestruction(simulation, satellite, sourceBody, kind, depth, generation, outcome) {
  if (satellite.destroyed) {
    return false;
  }
  satellite.destroyed = true;
  satellite.active = false;
  if (simulation.explosions) {
    simulation.explosions.push(
      createExplosion(
        satellite.x,
        satellite.y,
        satellite.radius + 12,
        kind === "rocket" ? "#79e0ff" : satellite.color,
      ),
    );
  }
  spawnDebrisFromImpact(satellite, sourceBody, simulation, depth, generation);
  if (simulation.predictedDestroyed) {
    simulation.predictedDestroyed.add(satellite.id);
  }
  simulation.lastImpactPoint = makePoint(satellite.x, satellite.y);
  if (!simulation.firstDetonationPoint) {
    simulation.firstDetonationPoint = makePoint(satellite.x, satellite.y);
  }
  if (kind === "rocket") {
    outcome.directHits += 1;
  } else {
    outcome.chainHits += 1;
  }
  return true;
}

function captureSettledTrail(targetList, body) {
  if (body.trail && body.trail.length > 1) {
    targetList.push(cloneTrail(body.trail));
  }
}

function stepSimulation(simulation, dt, previewMode = false) {
  const outcome = { directHits: 0, chainHits: 0 };
  const settledRocketTrails = [];
  const settledDebrisTrails = [];

  for (const rocket of simulation.rockets) {
    if (!rocket.active) {
      continue;
    }
    advanceBody(rocket, dt, CONFIG.rocketTrailLength, simulation.wells);
    if (isInsideAnyWell(rocket, simulation.wells) || isOutOfWorld(rocket)) {
      rocket.active = false;
      if (previewMode) {
        captureSettledTrail(settledRocketTrails, rocket);
      }
      continue;
    }

    for (const satellite of simulation.satellites) {
      if (satellite.destroyed) {
        continue;
      }
      const hitDistance = CONFIG.collisionRadius + rocket.radius;
      if (distanceSquared(rocket, satellite) <= hitDistance * hitDistance) {
        resolveSatelliteDestruction(simulation, satellite, rocket, "rocket", 0, 1, outcome);
        rocket.active = false;
        if (previewMode) {
          captureSettledTrail(settledRocketTrails, rocket);
        }
        break;
      }
    }
  }

  simulation.rockets = pruneInactive(simulation.rockets);
  if (previewMode && settledRocketTrails.length > 0) {
    simulation.previewRocketTrail = settledRocketTrails[settledRocketTrails.length - 1];
  }

  for (const satellite of simulation.satellites) {
    if (!satellite.destroyed) {
      updateSatelliteOrbit(satellite, dt, simulation.wells);
      if (satellite.motionMode === "orbit") {
        clampSatelliteToViewport(satellite);
      }
    }
  }

  for (const shard of simulation.debris) {
    if (!shard.active) {
      continue;
    }
    const debrisDt = dt * CONFIG.debrisTimeScale;
    shard.age = (shard.age || 0) + debrisDt;
    advanceBody(shard, debrisDt, CONFIG.debrisTrailLength, simulation.wells);
    if (isInsideAnyWell(shard, simulation.wells) || isOutOfWorld(shard)) {
      shard.active = false;
      if (previewMode && (shard.generation || 0) === 1) {
        captureSettledTrail(settledDebrisTrails, shard);
      }
    }
  }

  for (const shard of simulation.debris) {
    if (!shard.active) {
      continue;
    }

    for (const satellite of simulation.satellites) {
      if (satellite.destroyed) {
        continue;
      }
      const hitDistance = CONFIG.collisionRadius + shard.radius;
      if (distanceSquared(shard, satellite) <= hitDistance * hitDistance) {
        resolveSatelliteDestruction(
          simulation,
          satellite,
          shard,
          "debris",
          shard.depth + 1,
          (shard.generation || 1) + 1,
          outcome,
        );
        if (previewMode && (shard.generation || 0) === 1) {
          simulation.secondaryMarkers.push({
            x: satellite.x,
            y: satellite.y,
            shardEnd: makePoint(shard.x, shard.y),
            color: satellite.color,
            label: String(simulation.secondaryMarkers.length + 1),
            debrisYield: satellite.debrisYield,
          });
          captureSettledTrail(settledDebrisTrails, shard);
        }
        shard.active = false;
        break;
      }
    }
  }

  simulation.satellites = pruneInactive(simulation.satellites).concat(
    simulation.satellites.filter((satellite) => satellite.destroyed),
  );
  simulation.debris = pruneInactive(simulation.debris);
  if (simulation.explosions) {
    for (const explosion of simulation.explosions) {
      if (!explosion.active) {
        continue;
      }
      explosion.age += dt;
      if (explosion.age >= explosion.duration) {
        explosion.active = false;
      }
    }
    simulation.explosions = pruneInactive(simulation.explosions);
  }
  if (previewMode && settledDebrisTrails.length > 0) {
    simulation.previewDebrisTrails.push(...settledDebrisTrails);
  }

  return outcome;
}

function simulatePrediction(baseState, angleDeg) {
  const simulation = {
    ...buildPredictionState(baseState),
    rockets: [createRocket(angleDeg)],
    predictedDestroyed: new Set(),
    previewRocketTrail: [],
    previewDebrisTrails: [],
    secondaryMarkers: [],
    lastImpactPoint: null,
    firstDetonationPoint: null,
  };

  const level = currentLevel();
  const previewHorizon = level.previewHorizon || CONFIG.previewHorizon;
  const steps = Math.floor(previewHorizon / CONFIG.previewDt);
  let directHits = 0;
  let chainHits = 0;
  for (let step = 0; step < steps; step += 1) {
    simulation.time += CONFIG.previewDt;
    const outcome = stepSimulation(simulation, CONFIG.previewDt, true);
    directHits += outcome.directHits;
    chainHits += outcome.chainHits;
    if (simulation.rockets.length === 0 && simulation.debris.length === 0) {
      break;
    }
  }

  const rocket = simulation.rockets[0];
  const rocketTrail = rocket ? cloneTrail(rocket.trail) : simulation.previewRocketTrail;
  const debrisTrails = simulation.previewDebrisTrails.concat(
    simulation.debris
      .filter((shard) => (shard.generation || 0) === 1)
      .map((shard) => orbitGuidePoints(shard, CONFIG.orbitGuideHorizon, 0.12, simulation.wells)),
  );
  const normalizedDebrisTrails = simulation.firstDetonationPoint
    ? debrisTrails.map((trail) => prependStartPoint(trail, simulation.firstDetonationPoint))
    : debrisTrails;

  return {
    launchPoint: rocketTrail[0] || makePoint(CONFIG.launchX, CONFIG.launchY),
    rocketTrail,
    debrisTrails: normalizedDebrisTrails,
    secondaryMarkers: simulation.secondaryMarkers,
    directHits,
    chainHits,
    totalHits: simulation.predictedDestroyed.size,
    impactPoint: simulation.lastImpactPoint,
  };
}

function updateGame(dt) {
  state.launchCooldown = Math.max(0, state.launchCooldown - dt);
  if (state.paused || state.runEnded) {
    return;
  }

  state.time += dt;
  const beforeDestroyed = state.satellites.filter((satellite) => satellite.destroyed).length;
  const outcome = stepSimulation(state, dt, false);
  const afterDestroyed = state.satellites.filter((satellite) => satellite.destroyed).length;
  const newHits = afterDestroyed - beforeDestroyed;
  if (newHits > 0) {
    state.destroyedCount = afterDestroyed;
    state.totalChains += outcome.chainHits;
    state.score += newHits * CONFIG.scorePerSatellite + outcome.chainHits * CONFIG.scoreChainBonus;
  }

  state.destroyedCount = state.satellites.filter((satellite) => satellite.destroyed).length;

  const allSatellitesDestroyed = state.destroyedCount === state.satellites.length;
  if (!state.runEnded && allSatellitesDestroyed) {
    state.sectorCleared = true;
    state.runEnded = true;
    return;
  }

  if (
    !state.runEnded &&
    state.rocketsRemaining === 0 &&
    state.rockets.length === 0 &&
    state.debris.length === 0
  ) {
    state.runEnded = true;
  }
}

function clearTrackedSatellite() {
  state.trackedSatelliteId = null;
}

function trackedSatellite() {
  if (!state.trackedSatelliteId) {
    return null;
  }
  const satellite = state.satellites.find((candidate) => candidate.id === state.trackedSatelliteId);
  if (!satellite || satellite.destroyed) {
    clearTrackedSatellite();
    return null;
  }
  return satellite;
}

function setAngleValue(angle) {
  const minAngle = Number(angleInput.min);
  const maxAngle = Number(angleInput.max);
  const clamped = Math.min(maxAngle, Math.max(minAngle, angle));
  angleInput.value = String(clamped);
  mobileAngleInput.value = String(clamped);
  angleValue.textContent = `${angleInput.value}\u00b0`;
  mobileAngleValue.textContent = `${angleInput.value}\u00b0`;
}

function clearTrackingAndSetAngle(angle) {
  clearTrackedSatellite();
  setAngleValue(angle);
}

function angleToTarget(target) {
  const dx = target.x - CONFIG.launchX;
  const dy = CONFIG.launchY - target.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function updateAutoTracking() {
  if (state.runEnded || state.rockets.length > 0 || state.launchCooldown > 0) {
    return;
  }
  const target = trackedSatellite();
  if (!target) {
    return;
  }
  setAngleValue(angleToTarget(target));
}

function satelliteAtPoint(pointer) {
  for (const satellite of state.satellites) {
    if (satellite.destroyed) {
      continue;
    }
    const hitRadius = satellite.radius + 8;
    if (distanceSquared(pointer, satellite) <= hitRadius * hitRadius) {
      return satellite;
    }
  }
  return null;
}

function refreshPrediction() {
  if (state.runEnded || state.rocketsRemaining <= 0 || state.launchCooldown > 0 || state.rockets.length > 0) {
    state.preview = null;
    return;
  }
  state.preview = simulatePrediction(state, Number(angleInput.value));
}

function fireRocket() {
  if (state.runEnded || state.rocketsRemaining <= 0 || state.launchCooldown > 0 || state.rockets.length > 0) {
    return;
  }
  state.paused = false;
  state.rockets.push(createRocket(Number(angleInput.value)));
  state.rocketsRemaining -= 1;
  state.rocketsFired += 1;
  state.score = Math.max(0, state.score - CONFIG.scoreRocketPenalty);
  state.launchCooldown = CONFIG.launchCooldown;
  state.preview = null;
}

function loadLevel(levelIndex) {
  nextBodyId = 0;
  state = initialState(levelIndex);
  refreshPrediction();
  syncHud();
}

function restartRun() {
  loadLevel(currentLevelIndex);
}

function advanceLevel() {
  if (currentLevelIndex >= LEVELS.length - 1) {
    return;
  }
  loadLevel(currentLevelIndex + 1);
}

function togglePause() {
  if (state.runEnded || state.rockets.length > 0) {
    return;
  }
  state.paused = !state.paused;
  refreshPrediction();
  syncHud();
}

function syncHud() {
  const level = currentLevel();
  levelValue.textContent = level.name;
  hudLevelValue.textContent = level.name;
  mobileLevelValue.textContent = level.name;
  objectiveValue.textContent = level.objective;
  rocketsValue.textContent = String(state.rocketsRemaining);
  mobileRocketsValue.textContent = String(state.rocketsRemaining);
  destroyedValue.textContent = String(state.destroyedCount);
  chainsValue.textContent = String(state.totalChains);
  scoreValue.textContent = String(state.score);
  const statusText = state.runEnded
    ? state.sectorCleared
      ? currentLevelIndex === LEVELS.length - 1
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
  statusValue.textContent = statusText;
  mobileStatusValue.textContent = statusText;

  angleValue.textContent = `${angleInput.value}\u00b0`;
  mobileAngleInput.value = angleInput.value;
  mobileAngleValue.textContent = `${angleInput.value}\u00b0`;
  simulationSpeedValue.textContent = `${Number(simulationSpeedInput.value).toFixed(2)}\u00d7`;
  const pauseText = state.paused ? "Resume Orbit" : "Pause Orbit";
  pauseButton.textContent = pauseText;
  mobilePauseButton.textContent = pauseText;
  debrisModeButton.textContent =
    debrisMode === DEBRIS_MODES.classic
      ? "Debris Mode: Classic"
      : "Debris Mode: Ordered";
  const pauseDisabled = state.runEnded || state.rockets.length > 0;
  pauseButton.disabled = pauseDisabled;
  mobilePauseButton.disabled = pauseDisabled;
  const fireDisabled =
    state.runEnded ||
    state.rocketsRemaining <= 0 ||
    state.rockets.length > 0 ||
    state.launchCooldown > 0;
  fireButton.disabled = fireDisabled;
  mobileFireButton.disabled = fireDisabled;
  stopTrackingButton.disabled = !trackedSatellite();
  nextLevelButton.disabled = currentLevelIndex === LEVELS.length - 1;
}

function drawBackground() {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 170; i += 1) {
    const x = (i * 131) % CONFIG.width;
    const y = (i * 97) % CONFIG.height;
    const r = (i % 5) + 0.5;
    ctx.fillStyle = i % 11 === 0 ? "rgba(255,255,255,0.8)" : "rgba(180,220,255,0.45)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(96, 196, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < CONFIG.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.height);
    ctx.stroke();
  }
  for (let y = 40; y < CONFIG.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGravityWells() {
  for (const well of state.wellVisuals) {
    if (well.kind === "composite") {
      drawCompositeWell(well);
      continue;
    }
    ctx.save();
    const gradient = ctx.createRadialGradient(
      well.x - well.radius * 0.33,
      well.y - well.radius * 0.42,
      20,
      well.x,
      well.y,
      well.radius + 28,
    );
    gradient.addColorStop(0, well.glow);
    gradient.addColorStop(0.55, well.core);
    gradient.addColorStop(1, "#0d1a28");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(well.x, well.y, well.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = well.ring;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(well.x, well.y, well.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCompositeWell(well) {
  ctx.save();
  ctx.fillStyle = "#0d1a28";
  ctx.strokeStyle = well.ring;
  ctx.lineWidth = 2;
  for (const lobe of well.lobes) {
    const gradient = ctx.createRadialGradient(
      lobe.x - lobe.radius * 0.35,
      lobe.y - lobe.radius * 0.4,
      16,
      lobe.x,
      lobe.y,
      lobe.radius + 32,
    );
    gradient.addColorStop(0, well.glow);
    gradient.addColorStop(0.58, well.core);
    gradient.addColorStop(1, "#0d1a28");
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(lobe.x, lobe.y, lobe.radius + 12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = well.core;
  for (const lobe of well.lobes) {
    ctx.beginPath();
    ctx.arc(lobe.x, lobe.y, lobe.radius + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(well.x + well.visualRadius * 0.18, well.y - well.visualRadius * 0.14, well.visualRadius * 0.18, 0, Math.PI * 2);
  ctx.arc(well.x - well.visualRadius * 0.22, well.y + well.visualRadius * 0.08, well.visualRadius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = well.ring;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.ellipse(well.x, well.y, well.visualRadius, well.visualRadius * 0.82, deg(18), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const lobe of well.lobes) {
    ctx.fillStyle = "rgba(255, 240, 220, 0.08)";
    ctx.beginPath();
    ctx.arc(lobe.x, lobe.y, lobe.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLauncher() {
  ctx.save();
  ctx.fillStyle = "#12273b";
  ctx.beginPath();
  ctx.moveTo(CONFIG.launchX - 24, CONFIG.launchY + 14);
  ctx.lineTo(CONFIG.launchX + 28, CONFIG.launchY + 14);
  ctx.lineTo(CONFIG.launchX + 4, CONFIG.launchY - 30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#79e0ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CONFIG.launchX, CONFIG.launchY);
  const angle = (Number(angleInput.value) * Math.PI) / 180;
  ctx.lineTo(
    CONFIG.launchX + Math.cos(angle) * 52,
    CONFIG.launchY - Math.sin(angle) * 52,
  );
  ctx.stroke();
  ctx.restore();
}

function drawTrail(points, strokeStyle, width, dashed = false) {
  if (!points || points.length < 2) {
    return;
  }
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = width;
  if (dashed) {
    ctx.setLineDash([8, 10]);
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
  ctx.restore();
}

function orbitGuidePoints(body, horizon, stepSize, wells) {
  if (body.orbit) {
    const anchor = wells.find((well) => well.id === body.orbit.wellId) || wells[0];
    const points = [];
    let theta = body.orbit.theta;
    const thetaStep = body.orbit.angularSpeed * body.orbit.direction * stepSize;
    const steps = Math.floor(horizon / stepSize);
    for (let index = 0; index <= steps; index += 1) {
      const local = orbitLocalPosition(body.orbit, theta);
      const rotated = rotateVector(local, body.orbit.rotation);
      points.push(makePoint(anchor.x + rotated.x, anchor.y + rotated.y));
      theta += thetaStep;
    }
    return points;
  }
  const ghost = {
    x: body.x,
    y: body.y,
    vx: body.vx,
    vy: body.vy,
  };
  const points = [makePoint(ghost.x, ghost.y)];
  const steps = Math.floor(horizon / stepSize);
  for (let index = 0; index < steps; index += 1) {
    applyGravity(ghost, stepSize, wells);
    ghost.x += ghost.vx * stepSize;
    ghost.y += ghost.vy * stepSize;
    points.push(makePoint(ghost.x, ghost.y));
  }
  return points;
}

function fullOrbitGuidePoints(body, wells, segments = 180) {
  if (!body.orbit) {
    return orbitGuidePoints(body, CONFIG.ballisticGuideHorizon, 0.08, wells);
  }

  const anchor = wells.find((well) => well.id === body.orbit.wellId) || wells[0];
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const theta = (index / segments) * Math.PI * 2;
    const local = orbitLocalPosition(body.orbit, theta);
    const rotated = rotateVector(local, body.orbit.rotation);
    points.push(makePoint(anchor.x + rotated.x, anchor.y + rotated.y));
  }
  return points;
}

function drawOrbitGuides() {
  for (const satellite of state.satellites) {
    if (satellite.destroyed) {
      continue;
    }
    const isHovered = satellite.id === state.hoveredSatelliteId;
    const isTracked = satellite.id === state.trackedSatelliteId;
    drawTrail(
      fullOrbitGuidePoints(satellite, state.wells),
      isTracked || isHovered ? satellite.color : satellite.guideColor,
      isTracked ? 4 : isHovered ? 3 : 1.5,
      true,
    );
  }
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function updateHoveredSatellite(pointer) {
  const hoveredSatellite = satelliteAtPoint(pointer);
  const hoveredSatelliteId = hoveredSatellite ? hoveredSatellite.id : null;
  state.hoveredSatelliteId = hoveredSatelliteId;
  canvas.style.cursor = hoveredSatelliteId ? "pointer" : "default";
}

function clearHoveredSatellite() {
  state.hoveredSatelliteId = null;
  canvas.style.cursor = "default";
}

function trackSatelliteAtPoint(pointer) {
  const satellite = satelliteAtPoint(pointer);
  if (!satellite) {
    return false;
  }
  state.trackedSatelliteId = satellite.id;
  updateAutoTracking();
  refreshPrediction();
  syncHud();
  return true;
}

function drawYieldPips(satellite) {
  const yieldCount = satellite.debrisYield;
  if (yieldCount === 0) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-satellite.radius + 2, satellite.radius - 2);
    ctx.lineTo(satellite.radius - 2, -satellite.radius + 2);
    ctx.stroke();
    return;
  }

  const pipRadius = yieldCount >= 5 ? 1.7 : 1.5;
  const spacing = 4.6;
  const columns = yieldCount >= 5 ? 3 : Math.min(3, yieldCount);
  const rows = yieldCount >= 5 ? 2 : yieldCount > 1 ? Math.ceil(yieldCount / 2) : 1;
  const startX = -((columns - 1) * spacing) / 2;
  const startY = -((rows - 1) * spacing) / 2;

  ctx.fillStyle = "#f9feff";
  for (let index = 0; index < yieldCount; index += 1) {
    const row = rows === 1 ? 0 : Math.floor(index / columns);
    const col = rows === 1 ? index : index % columns;
    ctx.beginPath();
    ctx.arc(startX + col * spacing, startY + row * spacing, pipRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSatellites() {
  for (const satellite of state.satellites) {
    if (satellite.destroyed) {
      continue;
    }
    const isTracked = satellite.id === state.trackedSatelliteId;
    ctx.save();
    ctx.translate(satellite.x, satellite.y);
    ctx.strokeStyle = satellite.color;
    ctx.lineWidth = isTracked ? 3.8 : satellite.yieldBand === "large" ? 2.8 : 2.2;
    ctx.fillStyle = satellite.debrisYield === 0 ? "rgba(10, 18, 28, 0.9)" : "rgba(223, 239, 255, 0.96)";

    ctx.beginPath();
    ctx.arc(0, 0, satellite.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isTracked) {
      ctx.strokeStyle = "rgba(121, 224, 255, 0.92)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, satellite.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    const panelWidth = satellite.radius * 0.92;
    const wingOffset = satellite.radius + 3;
    ctx.beginPath();
    ctx.moveTo(-wingOffset - panelWidth, -1.5);
    ctx.lineTo(-wingOffset, -1.5);
    ctx.moveTo(wingOffset, -1.5);
    ctx.lineTo(wingOffset + panelWidth, -1.5);
    ctx.moveTo(-wingOffset - panelWidth, 1.5);
    ctx.lineTo(-wingOffset, 1.5);
    ctx.moveTo(wingOffset, 1.5);
    ctx.lineTo(wingOffset + panelWidth, 1.5);
    ctx.stroke();

    drawYieldPips(satellite);
    ctx.restore();
  }
}

function drawPreview() {
  if (!state.preview) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(121, 224, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(state.preview.launchPoint.x, state.preview.launchPoint.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawTrail(state.preview.rocketTrail, "rgba(121, 224, 255, 0.82)", 2.5);
  for (const trail of state.preview.debrisTrails) {
    drawTrail(trail, "rgba(255, 209, 102, 0.72)", 2.2);
    const endPoint = trail[trail.length - 1];
    if (endPoint) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 209, 102, 0.92)";
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (state.preview.impactPoint) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 209, 102, 0.92)";
    ctx.beginPath();
    ctx.arc(state.preview.impactPoint.x, state.preview.impactPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 107, 107, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.preview.impactPoint.x, state.preview.impactPoint.y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const marker of state.preview.secondaryMarkers) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 159, 28, 0.88)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(marker.shardEnd.x, marker.shardEnd.y);
    ctx.lineTo(marker.x, marker.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255, 159, 28, 0.2)";
    ctx.strokeStyle = "rgba(255, 159, 28, 0.96)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = marker.color;
    ctx.font = "bold 14px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(marker.label, marker.x, marker.y + 5);
    ctx.font = "11px Georgia";
    ctx.fillText(`${marker.debrisYield}`, marker.x, marker.y + 19);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = "rgba(5, 14, 23, 0.88)";
  ctx.fillRect(CONFIG.width - 308, 18, 278, 122);
  ctx.fillStyle = "#ecf7ff";
  ctx.font = "14px Georgia";
  ctx.fillText(`Direct hit: ${state.preview.directHits}`, CONFIG.width - 290, 44);
  ctx.fillText(`Predicted debris hits: ${state.preview.chainHits}`, CONFIG.width - 290, 68);
  ctx.fillText(`Total destroyed if fired: ${state.preview.totalHits}`, CONFIG.width - 290, 92);
  ctx.fillStyle = "#90a9be";
  ctx.fillText("Size = yield band, pips/slash = exact debris count", CONFIG.width - 290, 118);
  ctx.restore();
}

function drawActiveObjects() {
  for (const explosion of state.explosions) {
    const progress = Math.min(1, explosion.age / explosion.duration);
    const outerRadius = explosion.radius * (0.5 + progress * 1.35);
    const innerRadius = explosion.radius * (0.18 + progress * 0.42);
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    const flash = ctx.createRadialGradient(
      explosion.x,
      explosion.y,
      innerRadius * 0.2,
      explosion.x,
      explosion.y,
      outerRadius,
    );
    flash.addColorStop(0, "rgba(255, 250, 235, 0.96)");
    flash.addColorStop(0.28, explosion.color);
    flash.addColorStop(0.72, "rgba(255, 209, 102, 0.42)");
    flash.addColorStop(1, "rgba(255, 107, 107, 0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 244, 214, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, outerRadius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const rocket of state.rockets) {
    drawTrail(rocket.trail, "rgba(121, 224, 255, 0.25)", 2);
    ctx.save();
    ctx.fillStyle = rocket.color;
    ctx.beginPath();
    ctx.arc(rocket.x, rocket.y, rocket.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const shard of state.debris) {
    drawTrail(shard.trail, "rgba(255, 209, 102, 0.16)", 1.1);
    ctx.save();
    ctx.fillStyle = shard.color;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, shard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRunEnd() {
  if (!state.runEnded) {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(4, 12, 20, 0.72)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = "#ecf7ff";
  ctx.textAlign = "center";
  ctx.font = "bold 42px Georgia";
  ctx.fillText(
    state.sectorCleared
      ? currentLevelIndex === LEVELS.length - 1
        ? "Campaign Complete"
        : "Sector Clear"
      : "Run Complete",
    CONFIG.width / 2,
    CONFIG.height / 2 - 26,
  );
  ctx.font = "24px Georgia";
  ctx.fillText(`${state.destroyedCount} satellites down`, CONFIG.width / 2, CONFIG.height / 2 + 10);
  ctx.fillText(`${state.debris.length} debris shards remain in orbit`, CONFIG.width / 2, CONFIG.height / 2 + 44);
  ctx.font = "16px Georgia";
  ctx.fillStyle = "#90a9be";
  ctx.fillText(`Final score ${state.score}`, CONFIG.width / 2, CONFIG.height / 2 + 78);
  ctx.restore();
}

function render() {
  drawBackground();
  drawOrbitGuides();
  drawGravityWells();
  drawLauncher();
  drawPreview();
  drawSatellites();
  drawActiveObjects();
  drawRunEnd();
}

function frame(now) {
  const elapsed = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;
  updateGame(elapsed * Number(simulationSpeedInput.value));
  updateAutoTracking();
  refreshPrediction();
  syncHud();
  render();
  requestAnimationFrame(frame);
}

angleInput.addEventListener("input", () => {
  clearTrackedSatellite();
  setAngleValue(Number(angleInput.value));
  refreshPrediction();
  syncHud();
});

mobileAngleInput.addEventListener("input", () => {
  clearTrackedSatellite();
  setAngleValue(Number(mobileAngleInput.value));
  refreshPrediction();
  syncHud();
});

simulationSpeedInput.addEventListener("input", () => {
  syncHud();
});

canvas.addEventListener("pointermove", (event) => {
  const pointer = canvasPointFromEvent(event);
  if (event.pointerType === "mouse") {
    updateHoveredSatellite(pointer);
  } else if (activeCanvasPointer && activeCanvasPointer.id === event.pointerId) {
    activeCanvasPointer.moved =
      activeCanvasPointer.moved ||
      distanceSquared(activeCanvasPointer.startPoint, pointer) > POINTER_TAP_SLOP * POINTER_TAP_SLOP;
  }
});

canvas.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse") {
    clearHoveredSatellite();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  activeCanvasPointer = {
    id: event.pointerId,
    pointerType: event.pointerType,
    startPoint: canvasPointFromEvent(event),
    moved: false,
  };
  if (event.pointerType !== "mouse") {
    clearHoveredSatellite();
    canvas.setPointerCapture(event.pointerId);
  }
});

canvas.addEventListener("pointerup", (event) => {
  const pointer = canvasPointFromEvent(event);
  if (event.pointerType === "mouse") {
    trackSatelliteAtPoint(pointer);
    return;
  }
  if (!activeCanvasPointer || activeCanvasPointer.id !== event.pointerId) {
    return;
  }
  const moved =
    activeCanvasPointer.moved ||
    distanceSquared(activeCanvasPointer.startPoint, pointer) > POINTER_TAP_SLOP * POINTER_TAP_SLOP;
  activeCanvasPointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  if (!moved) {
    trackSatelliteAtPoint(pointer);
  }
});

canvas.addEventListener("pointercancel", (event) => {
  if (activeCanvasPointer && activeCanvasPointer.id === event.pointerId) {
    activeCanvasPointer = null;
  }
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowRight") {
    clearTrackingAndSetAngle(Number(angleInput.value) + 1);
    refreshPrediction();
    syncHud();
  } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
    clearTrackingAndSetAngle(Number(angleInput.value) - 1);
    refreshPrediction();
    syncHud();
  } else if (event.key === " ") {
    event.preventDefault();
    togglePause();
  } else if (event.key === "Enter") {
    event.preventDefault();
    fireRocket();
  } else if (event.key.toLowerCase() === "p") {
    togglePause();
  } else if (event.key.toLowerCase() === "r") {
    restartRun();
  } else if (event.key.toLowerCase() === "n") {
    advanceLevel();
  }
});

pauseButton.addEventListener("click", togglePause);
fireButton.addEventListener("click", fireRocket);
mobilePauseButton.addEventListener("click", togglePause);
mobileFireButton.addEventListener("click", fireRocket);
stopTrackingButton.addEventListener("click", () => {
  clearTrackedSatellite();
  refreshPrediction();
  syncHud();
});
restartButton.addEventListener("click", restartRun);
nextLevelButton.addEventListener("click", advanceLevel);
debrisModeButton.addEventListener("click", () => {
  debrisMode =
    debrisMode === DEBRIS_MODES.classic
      ? DEBRIS_MODES.ordered
      : DEBRIS_MODES.classic;
  refreshPrediction();
  syncHud();
});

refreshPrediction();
syncHud();
requestAnimationFrame(frame);
