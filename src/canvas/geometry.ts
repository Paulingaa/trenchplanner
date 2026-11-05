import { Point2D, TrenchSegment, BuildingElement } from '../types';

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function snapToGrid(val: number, gridSize: number): number {
  if (gridSize <= 0) return val;
  return Math.round(val / gridSize) * gridSize;
}

export function snapPointToGrid(p: Point2D, gridSize: number): Point2D {
  return {
    x: snapToGrid(p.x, gridSize),
    y: snapToGrid(p.y, gridSize),
  };
}

export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): { dist: number; proj: Point2D } {
  const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
  if (l2 === 0) return { dist: distance(p, a), proj: { ...a } };

  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const proj: Point2D = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return { dist: distance(p, proj), proj };
}

export function isPointInsideRect(p: Point2D, rect: { x: number; y: number; width: number; height: number; rotationDeg?: number }): boolean {
  let px = p.x - rect.x;
  let py = p.y - rect.y;

  if (rect.rotationDeg && rect.rotationDeg !== 0) {
    const rad = (-rect.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    px = rx;
    py = ry;
  }

  return px >= 0 && px <= rect.width && py >= 0 && py <= rect.height;
}

/**
 * Calculates genuine cycloidal / overlapping slinky loop centers and radius
 */
export interface SlinkyLoopData {
  center: Point2D;
  radius: number;
  circuitIndex: number;
  progress0to1: number; // overall progress from cold to warm
}

export function generateSlinkyLoops(
  segment: TrenchSegment,
  segmentIndex: number,
  totalSegments: number,
  loopCount: number
): SlinkyLoopData[] {
  if (loopCount <= 0 || segment.type !== 'slinky') return [];

  const dx = segment.endPoint.x - segment.startPoint.x;
  const dy = segment.endPoint.y - segment.startPoint.y;
  const segLen = Math.sqrt(dx * dx + dy * dy);
  if (segLen <= 0.1) return [];

  const ux = dx / segLen;
  const uy = dy / segLen;
  // Normal vector perpendicular to trench direction
  const nx = -uy;
  const ny = ux;

  const width = Math.max(0.6, segment.widthM || 1.2);
  const radius = (segment.loopDiameterM ? segment.loopDiameterM / 2 : (width - 0.1) / 2);
  const circuits = Math.max(1, segment.numberOfCircuits || 1);

  const loops: SlinkyLoopData[] = [];
  const spacing = segLen / (loopCount + 1);

  for (let c = 0; c < circuits; c++) {
    // Interleaved offset for parallel circuits
    const circuitOffset = (c / circuits) * (spacing * 0.5);
    // Slight lateral shift across trench bed for dual/triple pipe installation
    const lateralShift = circuits > 1 ? (c - (circuits - 1) / 2) * 0.12 : 0;

    for (let i = 1; i <= loopCount; i++) {
      const distAlong = i * spacing + circuitOffset;
      if (distAlong > segLen - radius * 0.5) continue;

      const cx = segment.startPoint.x + ux * distAlong + nx * lateralShift;
      const cy = segment.startPoint.y + uy * distAlong + ny * lateralShift;

      // Segment progress across entire trench route (0 = cold start, 1 = warm return)
      const segStartProg = totalSegments > 1 ? segmentIndex / totalSegments : 0;
      const segProg = (i / loopCount) * (1 / Math.max(1, totalSegments));
      const progress0to1 = Math.min(1, Math.max(0, segStartProg + segProg));

      loops.push({
        center: { x: cx, y: cy },
        radius,
        circuitIndex: c,
        progress0to1,
      });
    }
  }

  return loops;
}

/**
 * Interpolates color between Ice Blue (Cold inlet ~ -1.5°C) and Coral Amber (Warm return ~ +3.5°C)
 */
export function getThermalGradientColor(t: number): string {
  // t: 0.0 (cold) to 1.0 (warm)
  // Cold: #0284c7 (rgb 2, 132, 199)
  // Mid:  #10b981 (rgb 16, 185, 129)
  // Warm: #ea580c (rgb 234, 88, 12)
  const clamped = Math.max(0, Math.min(1, t));

  let r: number, g: number, b: number;
  if (clamped < 0.5) {
    const k = clamped * 2;
    r = Math.round(2 + (16 - 2) * k);
    g = Math.round(132 + (185 - 132) * k);
    b = Math.round(199 + (129 - 199) * k);
  } else {
    const k = (clamped - 0.5) * 2;
    r = Math.round(16 + (234 - 16) * k);
    g = Math.round(185 + (88 - 185) * k);
    b = Math.round(129 + (12 - 129) * k);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Clash detection: Check if trench segment is uninsulated and too close (< 1.5m) to a house
 */
export function checkTrenchClashes(
  segments: TrenchSegment[],
  obstacles: BuildingElement[]
): { segmentId: string; obstacleName: string; reason: string }[] {
  const clashes: { segmentId: string; obstacleName: string; reason: string }[] = [];

  for (const seg of segments) {
    for (const obs of obstacles) {
      if (obs.type === 'house') {
        // Distance check between segment and house center
        const houseCenter = { x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 };
        const { dist } = pointToSegmentDistance(houseCenter, seg.startPoint, seg.endPoint);
        const minSafeDist = Math.max(obs.width, obs.height) / 2 + 1.2;

        if (dist < minSafeDist && seg.type !== 'connection_insulated') {
          clashes.push({
            segmentId: seg.id,
            obstacleName: obs.name,
            reason: 'Grabenabschnitt verläuft sehr nah am Gebäude ohne Wärmedämmung (Gefahr von Unterkühlung des Mauerwerks)',
          });
        }
      } else if (obs.type === 'tree' && obs.radius) {
        const treeCenter = { x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 };
        const { dist } = pointToSegmentDistance(treeCenter, seg.startPoint, seg.endPoint);
        if (dist < obs.radius + 0.5) {
          clashes.push({
            segmentId: seg.id,
            obstacleName: obs.name,
            reason: 'Graben schneidet den Baumschutzbereich (Wurzelschäden möglich)',
          });
        }
      } else if (obs.type === 'cistern') {
        const cCenter = { x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 };
        const { dist } = pointToSegmentDistance(cCenter, seg.startPoint, seg.endPoint);
        if (dist < (obs.radius || 1.2) + 0.6) {
          clashes.push({
            segmentId: seg.id,
            obstacleName: obs.name,
            reason: 'Zu nah an der Zisterne (Gefahr von Frostschäden am Wasserspeicher)',
          });
        }
      }
    }
  }

  return clashes;
}
