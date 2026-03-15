import { CONFIG, DEBRIS_MODES } from "./config.js";
import { dom } from "./ui/dom.js";
import { gameStore } from "./core/store.js";
import {
  circularSpeed,
  cloneBody,
  cloneTrail,
  createDebrisShard,
  createExplosion,
  createRocket,
  debrisColor,
  nearestWell,
  prependStartPoint,
  recordTrail,
} from "./core/entities.js";
import {
  distanceSquared,
  magnitude,
  makePoint,
  normalize,
  orbitLocalPosition,
  orbitLocalVelocity,
  rotateVector,
  tangentFromRadial,
} from "./core/math.js";
import { currentLevel, trackedSatellite, clearTrackedSatellite } from "./state.js";

export function buildPredictionState(baseState) {
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

export function getVectorToWell(body, well) {
  return {
    x: well.x - body.x,
    y: well.y - body.y,
  };
}

export function getDistanceToWell(body, well) {
  return magnitude(getVectorToWell(body, well));
}

export function applyGravity(body, dt, wells) {
  for (const well of wells) {
    const toWell = getVectorToWell(body, well);
    const distance = Math.max(magnitude(toWell), well.radius + 8);
    const accelScale = well.mu / (distance * distance * distance);
    body.vx += toWell.x * accelScale * dt;
    body.vy += toWell.y * accelScale * dt;
  }
}

export function advanceBody(body, dt, trailLength, wells) {
  applyGravity(body, dt, wells);
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  recordTrail(body, trailLength);
}

export function clampSatelliteToViewport(satellite) {
  const margin = 24;
  satellite.x = Math.min(CONFIG.width - margin, Math.max(margin, satellite.x));
  satellite.y = Math.min(CONFIG.height - margin, Math.max(margin, satellite.y));
}

export function updateSatelliteOrbit(satellite, dt, wells) {
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

export function isOutOfWorld(body) {
  return (
    body.x < -CONFIG.worldPadding ||
    body.x > CONFIG.width + CONFIG.worldPadding ||
    body.y < -CONFIG.worldPadding ||
    body.y > CONFIG.height + CONFIG.worldPadding
  );
}

export function isInsideAnyWell(body, wells) {
  return wells.some((well) => {
    const captureRadius =
      body.kind === "debris"
        ? Math.max(CONFIG.debrisMinCaptureRadius, well.radius - CONFIG.debrisCaptureInset) + body.radius
        : well.radius + body.radius;
    return getDistanceToWell(body, well) <= captureRadius;
  });
}

export function pruneInactive(array) {
  return array.filter((body) => body.active !== false);
}

export function orbitalDirection(body, well) {
  const radial = {
    x: body.x - well.x,
    y: body.y - well.y,
  };
  return radial.x * body.vy - radial.y * body.vx >= 0 ? 1 : -1;
}

export function computeClassicDebrisVelocity(
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
  const stabilizedTangential = tangentialSpeed * 0.92 + orbitalTangential * 0.08;
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

export function spawnDebrisShardWithComponents(
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

export function spawnDebrisFromImpact(target, sourceBody, simulation, depth, generation) {
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

    if (gameStore.debrisMode === DEBRIS_MODES.ordered) {
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

export function resolveSatelliteDestruction(simulation, satellite, sourceBody, kind, depth, generation, outcome) {
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

export function stepSimulation(simulation, dt, previewMode = false) {
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

export function orbitGuidePoints(body, horizon, stepSize, wells) {
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

export function fullOrbitGuidePoints(body, wells, segments = 180) {
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

export function simulatePrediction(baseState, angleDeg) {
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

export function refreshPrediction() {
  const state = gameStore.state;
  if (state.runEnded || state.rocketsRemaining <= 0 || state.launchCooldown > 0 || state.rockets.length > 0) {
    state.preview = null;
    return;
  }
  state.preview = simulatePrediction(state, Number(dom.angleInput.value));
}

export function angleToTarget(target) {
  const dx = target.x - CONFIG.launchX;
  const dy = CONFIG.launchY - target.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function updateAutoTracking(setAngleValue) {
  const state = gameStore.state;
  if (state.runEnded || state.rockets.length > 0 || state.launchCooldown > 0) {
    return;
  }
  const target = trackedSatellite();
  if (!target) {
    return;
  }
  setAngleValue(angleToTarget(target));
}

export function satelliteAtPoint(pointer) {
  let bestSatellite = null;
  let bestDistanceSquared = Infinity;

  for (const satellite of gameStore.state.satellites) {
    if (satellite.destroyed) {
      continue;
    }

    const touchPadding = 18;
    const wingReach = satellite.radius + 3 + satellite.radius * 0.92 + touchPadding;
    const visualReach = Math.max(satellite.radius + 10 + touchPadding, wingReach + 10);
    const dx = Math.abs(pointer.x - satellite.x);
    const dy = Math.abs(pointer.y - satellite.y);
    const radialDistanceSquared = distanceSquared(pointer, satellite);

    if (radialDistanceSquared <= visualReach * visualReach && radialDistanceSquared < bestDistanceSquared) {
      bestSatellite = satellite;
      bestDistanceSquared = radialDistanceSquared;
      continue;
    }

    if (dx <= wingReach && dy <= satellite.radius + 8 + touchPadding && radialDistanceSquared < bestDistanceSquared) {
      bestSatellite = satellite;
      bestDistanceSquared = radialDistanceSquared;
    }
  }

  return bestSatellite;
}

export function updateGame(dt) {
  const state = gameStore.state;
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

export function fireRocket() {
  const state = gameStore.state;
  if (state.runEnded || state.rocketsRemaining <= 0 || state.launchCooldown > 0 || state.rockets.length > 0) {
    return;
  }
  state.paused = false;
  state.rockets.push(createRocket(Number(dom.angleInput.value)));
  state.rocketsRemaining -= 1;
  state.rocketsFired += 1;
  state.score = Math.max(0, state.score - CONFIG.scoreRocketPenalty);
  state.launchCooldown = CONFIG.launchCooldown;
  state.preview = null;
  clearTrackedSatellite();
}
