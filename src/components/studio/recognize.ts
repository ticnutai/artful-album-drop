import type { Pt, Shape } from "./drawStore";

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function pathLen(pts: Pt[]) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

function bbox(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// Ramer-Douglas-Peucker
function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  let maxD = 0, idx = 0;
  const a = pts[0], b = pts[pts.length - 1];
  const abx = b.x - a.x, aby = b.y - a.y;
  const abLen = Math.hypot(abx, aby) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const d = Math.abs((p.x - a.x) * aby - (p.y - a.y) * abx) / abLen;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const left = rdp(pts.slice(0, idx + 1), eps);
    const right = rdp(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

function centroid(pts: Pt[]): Pt {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}

/**
 * Recognize a stroke (points in percent coords 0-100) as a clean shape.
 * Returns null when confidence is low → keep the freehand stroke.
 */
export function recognize(
  pts: Pt[],
  color: string,
  width: number,
  id: string,
): Shape {
  const stroke: Shape = { id, kind: "stroke", points: pts, color, width };
  if (pts.length < 4) return stroke;

  const bb = bbox(pts);
  const diag = Math.hypot(bb.w, bb.h);
  if (diag < 2) return stroke; // tiny — treat as dot/stroke

  const len = pathLen(pts);
  const first = pts[0], last = pts[pts.length - 1];
  const endGap = dist(first, last);
  const closed = endGap / diag < 0.35;

  // Straightness: perimeter of a line = 2 * endpoint distance? No — straightness = endpoint distance / path length.
  const straightness = dist(first, last) / (len || 1);

  // Simplify to detect corner count
  const simplified = rdp(pts, diag * 0.04);
  const corners = closed ? simplified.length - 1 : simplified.length;

  // LINE / ARROW
  if (!closed && straightness > 0.75) {
    // Find the shaft: strip a short arrowhead tail so the line snaps to the intended endpoint.
    // Walk back from the end while direction stays consistent with overall.
    const dirMain = Math.atan2(last.y - first.y, last.x - first.x);
    let shaftEndIdx = pts.length - 1;
    for (let i = pts.length - 2; i > pts.length * 0.6; i--) {
      const d = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      const diff = Math.abs(((d - dirMain + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < 0.5) { shaftEndIdx = i + 1; break; }
    }
    const shaftEnd = pts[shaftEndIdx];
    // Arrowhead heuristic: any late segment deviates strongly from main direction
    let maxDelta = 0;
    for (let i = Math.floor(pts.length * 0.7); i < pts.length - 1; i++) {
      const d = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      const diff = Math.abs(((d - dirMain + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > maxDelta) maxDelta = diff;
    }
    if (maxDelta > 0.6) {
      return { id, kind: "arrow", x1: first.x, y1: first.y, x2: last.x, y2: last.y, color, width };
    }
    return { id, kind: "line", x1: first.x, y1: first.y, x2: shaftEnd.x, y2: shaftEnd.y, color, width };
  }

  // Loose fallback: mostly-straight open stroke → line
  if (!closed && straightness > 0.6) {
    return { id, kind: "line", x1: first.x, y1: first.y, x2: last.x, y2: last.y, color, width };
  }

  // CIRCLE: radii around centroid have low variance, and aspect ratio ~1
  const c = centroid(pts);
  const radii = pts.map((p) => dist(p, c));
  const meanR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const varR = radii.reduce((a, b) => a + (b - meanR) ** 2, 0) / radii.length;
  const cv = Math.sqrt(varR) / (meanR || 1);
  const aspect = bb.w / (bb.h || 1);
  if (cv < 0.35 && aspect > 0.6 && aspect < 1.7) {
    return { id, kind: "circle", cx: c.x, cy: c.y, r: meanR, color, width };
  }

  // RECTANGLE: 4 corners (5 with closing), reasonable fill of bbox
  if (corners === 4 || corners === 5) {
    return { id, kind: "rect", x: bb.minX, y: bb.minY, w: bb.w, h: bb.h, color, width };
  }

  // TRIANGLE
  if (corners === 3) {
    // Use the 3 most distant simplified points
    const s = simplified.slice(0, 3) as [Pt, Pt, Pt];
    return { id, kind: "triangle", points: s, color, width };
  }

  // Closed fallback → treat as circle around centroid
  if (closed) {
    return { id, kind: "circle", cx: c.x, cy: c.y, r: meanR, color, width };
  }

  return stroke;
}