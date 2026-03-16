import {
  CONFIG,
  MOBILE_VIEW_MAX_WIDTH,
  ORBIT_FAMILIES,
} from "../config.js";
import { allocateBodyId, gameStore } from "./store.js";
import {
  magnitude,
  makePoint,
  orbitLocalPosition,
  orbitLocalVelocity,
  rotateVector,
} from "./math.js";

export function isMobileView() {
  return window.matchMedia(`(max-width: ${MOBILE_VIEW_MAX_WIDTH}px), (pointer: coarse)`).matches;
}

export function isMobileLandscapeView() {
  return window.matchMedia(
    `((max-width: ${MOBILE_VIEW_MAX_WIDTH}px) and (orientation: landscape)), ((pointer: coarse) and (orientation: landscape))`,
  ).matches;
}

export function viewportSize() {
  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport ? viewport.width : window.innerWidth),
    height: Math.round(viewport ? viewport.height : window.innerHeight),
  };
}

export function satelliteVisualScale() {
  return isMobileView() ? 1.35 : 1;
}

export function yieldBand(debrisYield) {
  if (debrisYield >= 5) {
    return "large";
  }
  if (debrisYield >= 2) {
    return "medium";
  }
  return "small";
}

export function yieldRadius(debrisYield) {
  if (debrisYield >= 5) {
    return 15;
  }
  if (debrisYield >= 2) {
    return 12;
  }
  return 9;
}

export function cloneTrail(trail) {
  return trail.map((point) => ({ ...point }));
}

export function cloneBody(body) {
  return {
    ...body,
    orbit: body.orbit ? { ...body.orbit } : undefined,
    trail: cloneTrail(body.trail || []),
  };
}

export function circularSpeed(radius, well) {
  return Math.sqrt(well.mu / radius);
}

export function familyStyle(familyName) {
  return ORBIT_FAMILIES[familyName] || ORBIT_FAMILIES.inner;
}

export function debrisYieldStyle(debrisYield) {
  if (debrisYield >= 5) {
    return {
      color: "#ff6b6b",
      guideColor: "rgba(255, 107, 107, 0.22)",
      fillColor: "rgba(255, 235, 235, 0.95)",
    };
  }
  if (debrisYield >= 3) {
    return {
      color: "#ffd166",
      guideColor: "rgba(255, 209, 102, 0.22)",
      fillColor: "rgba(255, 246, 214, 0.95)",
    };
  }
  if (debrisYield >= 2) {
    return {
      color: "#7bdff2",
      guideColor: "rgba(123, 223, 242, 0.22)",
      fillColor: "rgba(232, 252, 255, 0.95)",
    };
  }
  if (debrisYield >= 1) {
    return {
      color: "#baffc9",
      guideColor: "rgba(186, 255, 201, 0.2)",
      fillColor: "rgba(241, 255, 246, 0.95)",
    };
  }
  return {
    color: "#c8b6ff",
    guideColor: "rgba(200, 182, 255, 0.2)",
    fillColor: "rgba(245, 240, 255, 0.95)",
  };
}

export function normalizeLevelWells(levelWells) {
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

function rotatedEllipseExtents(rx, ry, rotation = 0) {
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  return {
    x: Math.hypot(rx * cos, ry * sin),
    y: Math.hypot(rx * sin, ry * cos),
  };
}

export function landscapeSceneBounds(level) {
  const { physicalWells, visualWells } = normalizeLevelWells(level.wells);
  let minX = CONFIG.launchX - 24;
  let maxX = CONFIG.launchX + 28;
  let minY = CONFIG.launchY - 30;
  let maxY = CONFIG.launchY + 14;

  for (const well of visualWells) {
    if (well.kind === "composite") {
      const ringRadius = well.visualRadius || 0;
      minX = Math.min(minX, well.x - ringRadius - 12);
      maxX = Math.max(maxX, well.x + ringRadius + 12);
      minY = Math.min(minY, well.y - ringRadius * 0.82 - 12);
      maxY = Math.max(maxY, well.y + ringRadius * 0.82 + 12);
      for (const lobe of well.lobes) {
        minX = Math.min(minX, lobe.x - lobe.radius - 12);
        maxX = Math.max(maxX, lobe.x + lobe.radius + 12);
        minY = Math.min(minY, lobe.y - lobe.radius - 12);
        maxY = Math.max(maxY, lobe.y + lobe.radius + 12);
      }
      continue;
    }

    minX = Math.min(minX, well.x - well.radius - 12);
    maxX = Math.max(maxX, well.x + well.radius + 12);
    minY = Math.min(minY, well.y - well.radius - 12);
    maxY = Math.max(maxY, well.y + well.radius + 12);
  }

  for (const spec of level.satellites) {
    const radius = yieldRadius(spec.debrisYield) * satelliteVisualScale() + 16;
    if (spec.motionMode === "ballistic") {
      minX = Math.min(minX, spec.x - radius);
      maxX = Math.max(maxX, spec.x + radius);
      minY = Math.min(minY, spec.y - radius);
      maxY = Math.max(maxY, spec.y + radius);
      continue;
    }

    const anchor = physicalWells.find((well) => well.id === spec.wellId) || physicalWells[0];
    if (!anchor) {
      continue;
    }

    const extents = rotatedEllipseExtents(spec.rx, spec.ry, spec.rotation || 0);
    minX = Math.min(minX, anchor.x - extents.x - radius);
    maxX = Math.max(maxX, anchor.x + extents.x + radius);
    minY = Math.min(minY, anchor.y - extents.y - radius);
    maxY = Math.max(maxY, anchor.y + extents.y + radius);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    primaryWell: visualWells[0] || physicalWells[0] || { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5 },
  };
}

export function recordTrail(entity, maxPoints) {
  if (!entity.trail) {
    entity.trail = [];
  }
  entity.trail.push(makePoint(entity.x, entity.y));
  if (entity.trail.length > maxPoints) {
    entity.trail.shift();
  }
}

export function createSatellite(spec, wells) {
  if (spec.motionMode === "ballistic") {
    const orbitStyle = familyStyle(spec.orbitFamily);
    const yieldStyle = debrisYieldStyle(spec.debrisYield);
    return {
      id: allocateBodyId("sat"),
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
      color: yieldStyle.color,
      fillColor: yieldStyle.fillColor,
      guideColor: orbitStyle.guideColor,
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
  const orbitStyle = familyStyle(spec.orbitFamily);
  const yieldStyle = debrisYieldStyle(spec.debrisYield);
  const x = anchor.x + rotatedPosition.x;
  const y = anchor.y + rotatedPosition.y;

  return {
    id: allocateBodyId("sat"),
    kind: "satellite",
    motionMode: "orbit",
    orbit,
    x,
    y,
    vx: rotatedVelocity.x,
    vy: rotatedVelocity.y,
    radius: yieldRadius(spec.debrisYield),
    debrisYield: spec.debrisYield,
    yieldBand: yieldBand(spec.debrisYield),
    orbitFamily: spec.orbitFamily,
    color: yieldStyle.color,
    fillColor: yieldStyle.fillColor,
    guideColor: orbitStyle.guideColor,
    active: true,
    destroyed: false,
    trail: [makePoint(x, y)],
  };
}

export function createRocket(angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    id: allocateBodyId("rocket"),
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

export function createDebrisShard(x, y, vx, vy, depth, generation, color) {
  return {
    id: allocateBodyId("debris"),
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

export function debrisColor(generation) {
  return generation === 1 ? "#ffd166" : generation === 2 ? "#ff9f1c" : "#ff6b6b";
}

export function createExplosion(x, y, radius, color) {
  return {
    id: allocateBodyId("explosion"),
    x,
    y,
    radius,
    color,
    age: 0,
    duration: CONFIG.explosionDuration,
    active: true,
  };
}

export function prependStartPoint(trail, startPoint) {
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

export function nearestWell(body, wells = gameStore.state.wells) {
  let bestWell = wells[0];
  let bestDistance = Infinity;
  for (const well of wells) {
    const distance = Math.hypot(well.x - body.x, well.y - body.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestWell = well;
    }
  }
  return bestWell;
}
