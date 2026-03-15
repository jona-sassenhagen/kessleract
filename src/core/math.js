export function deg(degrees) {
  return (degrees * Math.PI) / 180;
}

export function makePoint(x, y) {
  return { x, y };
}

export function magnitude(vector) {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector) {
  const length = magnitude(vector) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

export function tangentFromRadial(radial, direction) {
  return direction >= 0
    ? { x: -radial.y, y: radial.x }
    : { x: radial.y, y: -radial.x };
}

export function rotateVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

export function orbitLocalPosition(orbit, theta) {
  return {
    x: Math.cos(theta) * orbit.rx,
    y: Math.sin(theta) * orbit.ry,
  };
}

export function orbitLocalVelocity(orbit, theta) {
  const dTheta = orbit.angularSpeed * orbit.direction;
  return {
    x: -Math.sin(theta) * orbit.rx * dTheta,
    y: Math.cos(theta) * orbit.ry * dTheta,
  };
}

export function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
