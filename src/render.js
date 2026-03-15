import { CONFIG } from "./config.js";
import { LEVELS } from "./levels.js";
import { dom } from "./ui/dom.js";
import { gameStore } from "./core/store.js";
import {
  isMobileLandscapeView,
  satelliteVisualScale,
} from "./core/entities.js";
import { deg } from "./core/math.js";
import {
  applyGravity,
  fullOrbitGuidePoints,
} from "./sim.js";

const { canvas, ctx } = dom;

export function drawBackground() {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let index = 0; index < 200; index += 1) {
    const x = (index * 131 + 47) % CONFIG.width;
    const y = (index * 97 + 23) % CONFIG.height;
    const radius = (index % 4) * 0.55 + 0.4;
    ctx.fillStyle = index % 13 === 0
      ? "rgba(255, 240, 200, 0.95)"
      : index % 7 === 0
        ? "rgba(255, 200, 100, 0.60)"
        : "rgba(210, 170, 80, 0.35)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(195, 138, 12, 0.07)";
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

export function drawCompositeWell(well) {
  ctx.save();
  ctx.fillStyle = "#080500";
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
    gradient.addColorStop(1, "#080500");
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

export function drawGravityWells() {
  for (const well of gameStore.state.wellVisuals) {
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
    gradient.addColorStop(1, "#080500");
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

export function drawLauncher() {
  ctx.save();
  ctx.fillStyle = "#1a1000";
  ctx.strokeStyle = "rgba(232, 160, 0, 0.40)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CONFIG.launchX - 24, CONFIG.launchY + 14);
  ctx.lineTo(CONFIG.launchX + 28, CONFIG.launchY + 14);
  ctx.lineTo(CONFIG.launchX + 4, CONFIG.launchY - 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#00e87a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CONFIG.launchX, CONFIG.launchY);
  const angle = (Number(dom.angleInput.value) * Math.PI) / 180;
  ctx.lineTo(
    CONFIG.launchX + Math.cos(angle) * 52,
    CONFIG.launchY - Math.sin(angle) * 52,
  );
  ctx.stroke();
  ctx.restore();
}

export function drawTrail(points, strokeStyle, width, dashed = false) {
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

export function drawOrbitGuides() {
  for (const satellite of gameStore.state.satellites) {
    if (satellite.destroyed) {
      continue;
    }
    const isHovered = satellite.id === gameStore.state.hoveredSatelliteId;
    const isTracked = satellite.id === gameStore.state.trackedSatelliteId;
    drawTrail(
      fullOrbitGuidePoints(satellite, gameStore.state.wells),
      isTracked || isHovered ? satellite.color : satellite.guideColor,
      isTracked ? 4 : isHovered ? 3 : 1.5,
      true,
    );
  }
}

export function drawYieldPips(satellite, scale = 1) {
  const yieldCount = satellite.debrisYield;
  if (yieldCount === 0) {
    ctx.strokeStyle = "rgba(255, 210, 100, 0.70)";
    ctx.lineWidth = 2 * Math.max(1, scale * 0.9);
    ctx.beginPath();
    ctx.moveTo(-satellite.radius + 2, satellite.radius - 2);
    ctx.lineTo(satellite.radius - 2, -satellite.radius + 2);
    ctx.stroke();
    return;
  }

  const pipRadius = (yieldCount >= 5 ? 1.7 : 1.5) * Math.max(1, scale * 0.95);
  const spacing = 4.6 * Math.max(1, scale * 0.92);
  const columns = yieldCount >= 5 ? 3 : Math.min(3, yieldCount);
  const rows = yieldCount >= 5 ? 2 : yieldCount > 1 ? Math.ceil(yieldCount / 2) : 1;
  const startX = -((columns - 1) * spacing) / 2;
  const startY = -((rows - 1) * spacing) / 2;

  ctx.fillStyle = "#ffe8a0";
  for (let index = 0; index < yieldCount; index += 1) {
    const row = rows === 1 ? 0 : Math.floor(index / columns);
    const col = rows === 1 ? index : index % columns;
    ctx.beginPath();
    ctx.arc(startX + col * spacing, startY + row * spacing, pipRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSatellites() {
  const scale = satelliteVisualScale();

  for (const satellite of gameStore.state.satellites) {
    if (satellite.destroyed) {
      continue;
    }
    const isTracked = satellite.id === gameStore.state.trackedSatelliteId;
    ctx.save();
    ctx.translate(satellite.x, satellite.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = satellite.color;
    ctx.lineWidth = (isTracked ? 3.8 : satellite.yieldBand === "large" ? 2.8 : 2.2) * Math.max(1, scale * 0.92);
    ctx.fillStyle = satellite.debrisYield === 0 ? "rgba(18, 12, 0, 0.92)" : "rgba(255, 240, 195, 0.94)";

    ctx.beginPath();
    ctx.arc(0, 0, satellite.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isTracked) {
      ctx.strokeStyle = "rgba(232, 160, 0, 0.90)";
      ctx.lineWidth = 2 * Math.max(1, scale * 0.9);
      ctx.beginPath();
      ctx.arc(0, 0, satellite.radius + 7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(232, 160, 0, 0.35)";
      ctx.lineWidth = 6 * Math.max(1, scale * 0.82);
      ctx.beginPath();
      ctx.arc(0, 0, satellite.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    const panelWidth = satellite.radius * 0.92;
    const wingOffset = satellite.radius + 3;
    const wingLineOffset = 1.5;
    ctx.beginPath();
    ctx.moveTo(-wingOffset - panelWidth, -wingLineOffset);
    ctx.lineTo(-wingOffset, -wingLineOffset);
    ctx.moveTo(wingOffset, -wingLineOffset);
    ctx.lineTo(wingOffset + panelWidth, -wingLineOffset);
    ctx.moveTo(-wingOffset - panelWidth, wingLineOffset);
    ctx.lineTo(-wingOffset, wingLineOffset);
    ctx.moveTo(wingOffset, wingLineOffset);
    ctx.lineTo(wingOffset + panelWidth, wingLineOffset);
    ctx.stroke();

    drawYieldPips(satellite, scale);
    ctx.restore();
  }
}

export function drawPreview() {
  const preview = gameStore.state.preview;
  if (!preview) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(0, 232, 122, 0.95)";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(0, 232, 122, 0.8)";
  ctx.beginPath();
  ctx.arc(preview.launchPoint.x, preview.launchPoint.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawTrail(preview.rocketTrail, "rgba(0, 232, 122, 0.82)", 2.5);
  for (const trail of preview.debrisTrails) {
    drawTrail(trail, "rgba(232, 160, 0, 0.72)", 2.2);
    const endPoint = trail[trail.length - 1];
    if (endPoint) {
      ctx.save();
      ctx.fillStyle = "rgba(232, 160, 0, 0.92)";
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (preview.impactPoint) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 232, 122, 0.92)";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 232, 122, 0.7)";
    ctx.beginPath();
    ctx.arc(preview.impactPoint.x, preview.impactPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 232, 122, 0.80)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(preview.impactPoint.x, preview.impactPoint.y, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(232, 160, 0, 0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(preview.impactPoint.x, preview.impactPoint.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  for (const marker of preview.secondaryMarkers) {
    ctx.save();
    ctx.strokeStyle = "rgba(232, 160, 0, 0.70)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(marker.shardEnd.x, marker.shardEnd.y);
    ctx.lineTo(marker.x, marker.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(232, 160, 0, 0.12)";
    ctx.strokeStyle = "rgba(232, 160, 0, 0.90)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(232, 160, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = marker.color;
    ctx.font = "bold 13px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(marker.label, marker.x, marker.y + 4);
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillStyle = "rgba(232, 160, 0, 0.75)";
    ctx.fillText(`${marker.debrisYield}`, marker.x, marker.y + 17);
    ctx.restore();
  }

  if (isMobileLandscapeView()) {
    return;
  }

  ctx.save();
  const panelX = CONFIG.width - 312;
  const panelY = 14;
  const panelW = 286;
  const panelH = 126;
  ctx.fillStyle = "rgba(10, 7, 0, 0.92)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = "rgba(232, 160, 0, 0.55)";
  ctx.fillRect(panelX, panelY, panelW, 2);
  ctx.strokeStyle = "rgba(232, 160, 0, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = "rgba(232, 160, 0, 0.40)";
  ctx.fillRect(panelX, panelY, 2, panelH);

  ctx.fillStyle = "#c09030";
  ctx.font = "13px 'Share Tech Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`DIRECT HIT      ${preview.directHits}`, panelX + 16, panelY + 28);
  ctx.fillText(`DEBRIS CHAIN    ${preview.chainHits}`, panelX + 16, panelY + 52);
  ctx.fillStyle = "#e8a000";
  ctx.font = "bold 13px 'Share Tech Mono', monospace";
  ctx.fillText(`TOTAL KILLS     ${preview.totalHits}`, panelX + 16, panelY + 76);
  ctx.fillStyle = "rgba(90, 64, 16, 0.85)";
  ctx.font = "11px 'Share Tech Mono', monospace";
  ctx.fillText("size=band  pips/slash=debris count", panelX + 16, panelY + 108);
  ctx.restore();
}

export function drawActiveObjects() {
  for (const explosion of gameStore.state.explosions) {
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

  for (const rocket of gameStore.state.rockets) {
    drawTrail(rocket.trail, "rgba(0, 232, 122, 0.22)", 2);
    ctx.save();
    ctx.fillStyle = rocket.color;
    ctx.beginPath();
    ctx.arc(rocket.x, rocket.y, rocket.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const shard of gameStore.state.debris) {
    drawTrail(shard.trail, "rgba(255, 209, 102, 0.16)", 1.1);
    ctx.save();
    ctx.fillStyle = shard.color;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, shard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawRunEnd() {
  if (!gameStore.state.runEnded) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(8, 5, 0, 0.82)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  const centerY = CONFIG.height / 2;
  ctx.strokeStyle = "rgba(232, 160, 0, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CONFIG.width * 0.15, centerY - 58);
  ctx.lineTo(CONFIG.width * 0.85, centerY - 58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CONFIG.width * 0.15, centerY + 90);
  ctx.lineTo(CONFIG.width * 0.85, centerY + 90);
  ctx.stroke();

  const title = gameStore.state.sectorCleared
    ? gameStore.currentLevelIndex === LEVELS.length - 1
      ? "CAMPAIGN COMPLETE"
      : "SECTOR CLEAR"
    : "RUN COMPLETE";
  ctx.textAlign = "center";
  ctx.shadowBlur = 24;
  ctx.shadowColor = "rgba(232, 160, 0, 0.65)";
  ctx.fillStyle = "#e8a000";
  ctx.font = "bold 46px 'Orbitron', sans-serif";
  ctx.fillText(title, CONFIG.width / 2, centerY - 12);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#c09030";
  ctx.font = "22px 'Share Tech Mono', monospace";
  ctx.fillText(`${gameStore.state.destroyedCount} SATELLITES DOWN`, CONFIG.width / 2, centerY + 26);
  ctx.font = "18px 'Share Tech Mono', monospace";
  ctx.fillText(`${gameStore.state.debris.length} DEBRIS SHARDS IN ORBIT`, CONFIG.width / 2, centerY + 56);

  ctx.fillStyle = "#5a4010";
  ctx.font = "14px 'Share Tech Mono', monospace";
  ctx.fillText(`FINAL SCORE  ${gameStore.state.score}`, CONFIG.width / 2, centerY + 80);
  ctx.restore();
}

export function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function updateHoveredSatellite(pointer) {
  const hoveredSatellite = gameStore.state.satellites.find((satellite) => {
    if (satellite.destroyed) {
      return false;
    }
    const touchPadding = 18;
    const wingReach = satellite.radius + 3 + satellite.radius * 0.92 + touchPadding;
    const visualReach = Math.max(satellite.radius + 10 + touchPadding, wingReach + 10);
    const dx = Math.abs(pointer.x - satellite.x);
    const dy = Math.abs(pointer.y - satellite.y);
    const radialDistanceSquared =
      (pointer.x - satellite.x) * (pointer.x - satellite.x) +
      (pointer.y - satellite.y) * (pointer.y - satellite.y);
    return (
      radialDistanceSquared <= visualReach * visualReach ||
      (dx <= wingReach && dy <= satellite.radius + 8 + touchPadding)
    );
  });

  gameStore.state.hoveredSatelliteId = hoveredSatellite ? hoveredSatellite.id : null;
  canvas.style.cursor = hoveredSatellite ? "pointer" : "default";
}

export function clearHoveredSatellite() {
  gameStore.state.hoveredSatelliteId = null;
  canvas.style.cursor = "default";
}

export function render() {
  drawBackground();
  drawOrbitGuides();
  drawGravityWells();
  drawLauncher();
  drawPreview();
  drawSatellites();
  drawActiveObjects();
  drawRunEnd();
}
