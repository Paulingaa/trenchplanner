import {
  Point2D,
  RgkProjectState,
  TrenchSegment,
  BuildingElement,
  DistributorLocation,
} from '../types';
import {
  generateSlinkyLoops,
  getThermalGradientColor,
} from './geometry';
import { SOIL_SPECS } from '../core/soils';

export interface ViewportTransform {
  scale: number; // pixels per meter
  panX: number;  // offset in pixels
  panY: number;  // offset in pixels
}

export interface RenderOptions {
  theme: 'dark' | 'light';
  showGrid: boolean;
  gridSnapM: number;
  showSlinkyRings: boolean;
  showDimensions: boolean;
  showCorridors: boolean;
  selectedSegmentId: string | null;
  selectedObstacleId: string | null;
  hoveredHandleId: string | null;
  activeTool: 'select' | 'draw_segment' | 'add_obstacle';
  drawingTempPoint: Point2D | null;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number = window.devicePixelRatio || 1) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // World (meters) to Screen (pixels)
  public worldToScreen(p: Point2D, vp: ViewportTransform): Point2D {
    return {
      x: p.x * vp.scale + vp.panX,
      y: p.y * vp.scale + vp.panY,
    };
  }

  // Screen (pixels) to World (meters)
  public screenToWorld(sp: Point2D, vp: ViewportTransform): Point2D {
    return {
      x: (sp.x - vp.panX) / vp.scale,
      y: (sp.y - vp.panY) / vp.scale,
    };
  }

  public render(state: RgkProjectState, vp: ViewportTransform, options: RenderOptions) {
    const ctx = this.ctx;
    const isDark = options.theme === 'dark';

    // Clear canvas
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Grid
    if (options.showGrid) {
      this.drawGrid(vp, isDark);
    }

    // 2. Property Boundary & Setback
    this.drawProperty(state.property, vp, isDark);

    // 3. Obstacles (Buildings, Trees, Cisterns)
    this.drawObstacles(state.obstacles, vp, options, isDark);

    // 4. Trench Segments
    this.drawTrenchSegments(state, vp, options, isDark);

    // 5. Distributor / Technical Room Marker
    this.drawDistributor(state.distributor, vp, isDark);

    // 6. Drawing preview line
    if (options.activeTool === 'draw_segment' && options.drawingTempPoint && state.segments.length > 0) {
      const lastSeg = state.segments[state.segments.length - 1];
      const p1 = this.worldToScreen(lastSeg.endPoint, vp);
      const p2 = this.worldToScreen(options.drawingTempPoint, vp);

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Scale Ruler
    this.drawScaleRuler(vp, isDark);

    ctx.restore();
  }

  private drawGrid(vp: ViewportTransform, isDark: boolean) {
    const ctx = this.ctx;
    const { scale, panX, panY } = vp;

    // Determine grid step in meters based on zoom scale
    let gridStepM = 1.0;
    if (scale < 12) gridStepM = 5.0;
    else if (scale < 25) gridStepM = 2.0;
    else if (scale > 60) gridStepM = 0.5;

    const startX = Math.floor(-panX / scale / gridStepM) * gridStepM;
    const endX = Math.ceil((this.width - panX) / scale / gridStepM) * gridStepM;
    const startY = Math.floor(-panY / scale / gridStepM) * gridStepM;
    const endY = Math.ceil((this.height - panY) / scale / gridStepM) * gridStepM;

    ctx.save();
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += gridStepM) {
      const sx = x * scale + panX;
      const isMajor = Math.round(x) % 5 === 0;

      ctx.strokeStyle = isDark
        ? (isMajor ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)')
        : (isMajor ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)');

      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.height);
      ctx.stroke();

      if (isMajor && scale > 15) {
        ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText(`${x}m`, sx + 4, 14);
      }
    }

    for (let y = startY; y <= endY; y += gridStepM) {
      const sy = y * scale + panY;
      const isMajor = Math.round(y) % 5 === 0;

      ctx.strokeStyle = isDark
        ? (isMajor ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)')
        : (isMajor ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)');

      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(this.width, sy);
      ctx.stroke();

      if (isMajor && scale > 15) {
        ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText(`${y}m`, 4, sy - 4);
      }
    }

    ctx.restore();
  }

  private drawProperty(property: RgkProjectState['property'], vp: ViewportTransform, isDark: boolean) {
    if (!property.points || property.points.length < 3) return;
    const ctx = this.ctx;

    ctx.save();

    // Property Polygon Fill
    ctx.beginPath();
    const first = this.worldToScreen(property.points[0], vp);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < property.points.length; i++) {
      const sp = this.worldToScreen(property.points[i], vp);
      ctx.lineTo(sp.x, sp.y);
    }
    ctx.closePath();

    ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.05)';
    ctx.fill();

    // Property Boundary Outline
    ctx.strokeStyle = isDark ? '#10b981' : '#059669';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Setback line (Grenzabstand)
    if (property.setbackM > 0) {
      ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Calculate inner offset polygon approximation
      ctx.beginPath();
      const count = property.points.length;
      for (let i = 0; i < count; i++) {
        const p = property.points[i];
        // simple centroid-directed setback offset
        const cx = property.points.reduce((acc, pt) => acc + pt.x, 0) / count;
        const cy = property.points.reduce((acc, pt) => acc + pt.y, 0) / count;
        const dirX = cx - p.x;
        const dirY = cy - p.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        const offsetP: Point2D = {
          x: p.x + (dirX / len) * property.setbackM,
          y: p.y + (dirY / len) * property.setbackM,
        };
        const sp = this.worldToScreen(offsetP, vp);
        if (i === 0) ctx.moveTo(sp.x, sp.y);
        else ctx.lineTo(sp.x, sp.y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawObstacles(
    obstacles: BuildingElement[],
    vp: ViewportTransform,
    options: RenderOptions,
    isDark: boolean
  ) {
    const ctx = this.ctx;

    for (const obs of obstacles) {
      ctx.save();
      const isSelected = options.selectedObstacleId === obs.id;

      if (obs.type === 'tree') {
        const center = this.worldToScreen({ x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 }, vp);
        const radiusPx = (obs.radius || 2) * vp.scale;

        // Root zone
        ctx.beginPath();
        ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.2)';
        ctx.fill();
        ctx.strokeStyle = isDark ? '#22c55e' : '#16a34a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        // Tree trunk
        ctx.beginPath();
        ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#92400e';
        ctx.fill();

        // Label
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(obs.name, center.x, center.y + radiusPx + 14);
      } else if (obs.type === 'cistern') {
        const center = this.worldToScreen({ x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 }, vp);
        const radiusPx = (obs.radius || 1.25) * vp.scale;

        ctx.beginPath();
        ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = isDark ? '#67e8f9' : '#0891b2';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💧 ' + obs.name, center.x, center.y + 4);
      } else {
        // Rectangle elements: house, garage, terrace
        const sp = this.worldToScreen({ x: obs.x, y: obs.y }, vp);
        const wPx = obs.width * vp.scale;
        const hPx = obs.height * vp.scale;

        ctx.translate(sp.x, sp.y);
        if (obs.rotationDeg) {
          ctx.rotate((obs.rotationDeg * Math.PI) / 180);
        }

        if (obs.type === 'house') {
          ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
          ctx.fillRect(0, 0, wPx, hPx);

          ctx.strokeStyle = isSelected ? '#38bdf8' : (isDark ? '#64748b' : '#475569');
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.strokeRect(0, 0, wPx, hPx);

          // Diagonal hatch pattern or architectural label
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obs.name, wPx / 2, hPx / 2 - 4);

          ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
          ctx.font = '11px monospace';
          ctx.fillText(`${obs.width.toFixed(1)}m × ${obs.height.toFixed(1)}m`, wPx / 2, hPx / 2 + 14);
        } else if (obs.type === 'garage') {
          ctx.fillStyle = isDark ? '#182030' : '#f1f5f9';
          ctx.fillRect(0, 0, wPx, hPx);
          ctx.strokeStyle = isSelected ? '#38bdf8' : (isDark ? '#475569' : '#94a3b8');
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, wPx, hPx);

          ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obs.name, wPx / 2, hPx / 2);
        } else if (obs.type === 'terrace') {
          ctx.fillStyle = isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.12)';
          ctx.fillRect(0, 0, wPx, hPx);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(0, 0, wPx, hPx);

          ctx.fillStyle = '#d97706';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obs.name, wPx / 2, hPx / 2);
        }
      }

      ctx.restore();
    }
  }

  private drawTrenchSegments(
    state: RgkProjectState,
    vp: ViewportTransform,
    options: RenderOptions,
    isDark: boolean
  ) {
    const ctx = this.ctx;
    const { segments, parameters } = state;
    const totalSegments = segments.length;

    segments.forEach((seg, idx) => {
      const isSelected = options.selectedSegmentId === seg.id;
      const p1 = this.worldToScreen(seg.startPoint, vp);
      const p2 = this.worldToScreen(seg.endPoint, vp);

      const dx = seg.endPoint.x - seg.startPoint.x;
      const dy = seg.endPoint.y - seg.startPoint.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen <= 0.05) return;

      const ux = dx / segLen;
      const uy = dy / segLen;
      const nx = -uy;
      const ny = ux;

      const widthM = seg.widthM || 1.2;
      const widthPx = widthM * vp.scale;
      const halfW = widthPx / 2;

      // 1. Excavation Corridor Trench Bed
      if (options.showCorridors) {
        ctx.save();
        const p1Left = { x: p1.x + nx * halfW, y: p1.y + ny * halfW };
        const p1Right = { x: p1.x - nx * halfW, y: p1.y - ny * halfW };
        const p2Right = { x: p2.x - nx * halfW, y: p2.y - ny * halfW };
        const p2Left = { x: p2.x + nx * halfW, y: p2.y + ny * halfW };

        ctx.beginPath();
        ctx.moveTo(p1Left.x, p1Left.y);
        ctx.lineTo(p2Left.x, p2Left.y);
        ctx.lineTo(p2Right.x, p2Right.y);
        ctx.lineTo(p1Right.x, p1Right.y);
        ctx.closePath();

        // Soil color tint
        const soilType = seg.soilOverride || parameters.defaultSoil;
        const soil = SOIL_SPECS[soilType];
        ctx.fillStyle = isDark ? `${soil.color}22` : `${soil.color}28`;
        ctx.fill();

        ctx.strokeStyle = isSelected
          ? '#38bdf8'
          : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)');
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash(seg.type.startsWith('connection') ? [4, 4] : []);
        ctx.stroke();

        ctx.restore();
      }

      // 2. Pipes & Slinky Loops
      ctx.save();
      const progressT = totalSegments > 1 ? idx / (totalSegments - 1) : 0;
      const thermalColor = getThermalGradientColor(progressT);

      if (seg.type === 'slinky' && options.showSlinkyRings) {
        // Calculate loop count from allocated pipe
        const pipePerCircuit = seg.allocatedPipeLengthM || 0;
        const loopDiameter = seg.loopDiameterM || Math.max(0.6, widthM - 0.1);
        const loopCirc = Math.PI * loopDiameter;
        let loopCount = 0;
        if (pipePerCircuit > segLen && loopCirc > 0) {
          loopCount = Math.max(1, Math.round((pipePerCircuit - segLen) / loopCirc));
        }

        const slinkyLoops = generateSlinkyLoops(seg, idx, totalSegments, loopCount);

        for (const loop of slinkyLoops) {
          const sc = this.worldToScreen(loop.center, vp);
          const rPx = loop.radius * vp.scale;
          const loopColor = getThermalGradientColor(loop.progress0to1);

          ctx.beginPath();
          ctx.arc(sc.x, sc.y, rPx, 0, Math.PI * 2);
          ctx.strokeStyle = loopColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      } else if (seg.type === 'connection_insulated') {
        // Insulated protective yellow/orange sheath
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Inner core pipe
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Straight or connection pipes
        const circuits = Math.max(1, seg.numberOfCircuits || 1);
        for (let c = 0; c < circuits; c++) {
          const offsetDist = circuits > 1 ? (c - (circuits - 1) / 2) * 0.15 : 0;
          const cP1 = { x: p1.x + nx * offsetDist * vp.scale, y: p1.y + ny * offsetDist * vp.scale };
          const cP2 = { x: p2.x + nx * offsetDist * vp.scale, y: p2.y + ny * offsetDist * vp.scale };

          ctx.beginPath();
          ctx.moveTo(cP1.x, cP1.y);
          ctx.lineTo(cP2.x, cP2.y);
          ctx.strokeStyle = thermalColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }

      ctx.restore();

      // 3. Segment Centerline & Waypoint Handles
      ctx.save();
      // Handle Start
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Handle End
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Dimensions & Segment Name Label
      if (options.showDimensions) {
        const midX = (p1.x + p2.x) / 2 + nx * (halfW + 12);
        const midY = (p1.y + p2.y) / 2 + ny * (halfW + 12);

        ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelText = `${seg.name}: ${segLen.toFixed(1)}m (${seg.widthM.toFixed(1)}m B, ${seg.depthM.toFixed(1)}m T)`;
        
        // Background badge
        const textMetrics = ctx.measureText(labelText);
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(midX - textMetrics.width / 2 - 4, midY - 8, textMetrics.width + 8, 16);
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - textMetrics.width / 2 - 4, midY - 8, textMetrics.width + 8, 16);

        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.fillText(labelText, midX, midY);
      }

      ctx.restore();
    });
  }

  private drawDistributor(distributor: DistributorLocation, vp: ViewportTransform, isDark: boolean) {
    if (!distributor) return;
    const ctx = this.ctx;
    const sp = this.worldToScreen({ x: distributor.x, y: distributor.y }, vp);

    ctx.save();
    // Glowing ring
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fill();

    // Inner marker badge
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = isDark ? '#38bdf8' : '#0369a1';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚙️ ' + distributor.name, sp.x, sp.y - 14);

    ctx.restore();
  }

  private drawScaleRuler(vp: ViewportTransform, isDark: boolean) {
    const ctx = this.ctx;
    const x = this.width - 150;
    const y = this.height - 25;

    // Pick a rounded meter distance for ruler (e.g. 5m or 10m)
    let meterBar = 5;
    if (vp.scale > 35) meterBar = 2;
    if (vp.scale < 15) meterBar = 10;
    const pxLen = meterBar * vp.scale;

    ctx.save();
    // Background pill
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(x - 10, y - 18, pxLen + 20, 30);
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
    ctx.strokeRect(x - 10, y - 18, pxLen + 20, 30);

    // Ruler bar
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y);
    ctx.lineTo(x + pxLen, y);
    ctx.lineTo(x + pxLen, y - 4);
    ctx.stroke();

    // Text
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${meterBar} m`, x + pxLen / 2, y - 6);

    ctx.restore();
  }
}
