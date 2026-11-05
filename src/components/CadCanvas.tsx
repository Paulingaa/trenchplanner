import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  MousePointer,
  Plus,
  Home,
  Trees,
  Droplet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Eye,
  Sliders,
  Move,
} from 'lucide-react';
import {
  RgkProjectState,
  Point2D,
  TrenchSegment,
  BuildingElement,
  Theme,
} from '../types';
import { CanvasRenderer, ViewportTransform } from '../canvas/CanvasRenderer';
import {
  snapPointToGrid,
  distance,
  pointToSegmentDistance,
  isPointInsideRect,
} from '../canvas/geometry';

interface CadCanvasProps {
  state: RgkProjectState;
  onUpdateState: (newState: RgkProjectState) => void;
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  theme: Theme;
}

type CadTool = 'select' | 'draw_segment' | 'add_house' | 'add_tree' | 'add_cistern';

export const CadCanvas: React.FC<CadCanvasProps> = ({
  state,
  onUpdateState,
  selectedSegmentId,
  onSelectSegment,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  // Viewport Transform
  const [viewport, setViewport] = useState<ViewportTransform>({
    scale: 22, // 22 pixels per meter
    panX: 80,
    panY: 80,
  });

  // Tools & Display Options
  const [activeTool, setActiveTool] = useState<CadTool>('select');
  const [gridSnapM, setGridSnapM] = useState<number>(0.5);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showSlinkyRings, setShowSlinkyRings] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);

  // Selection & Dragging state
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingHandle, setDraggingHandle] = useState<{ segmentId: string; which: 'start' | 'end' } | null>(null);
  const [draggingObstacle, setDraggingObstacle] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point2D>({ x: 0, y: 0 });
  const [drawingTempPoint, setDrawingTempPoint] = useState<Point2D | null>(null);

  // Initialize Canvas Renderer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const dpr = window.devicePixelRatio || 1;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new CanvasRenderer(ctx, w, h, dpr);
  }, []);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
      rendererRef.current.resize(w, h);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render loop
  const triggerRender = useCallback(() => {
    if (!rendererRef.current) return;
    rendererRef.current.render(state, viewport, {
      theme,
      showGrid,
      gridSnapM,
      showSlinkyRings,
      showDimensions,
      showCorridors,
      selectedSegmentId,
      selectedObstacleId,
      hoveredHandleId,
      activeTool: activeTool === 'draw_segment' ? 'draw_segment' : 'select',
      drawingTempPoint,
    });
  }, [
    state,
    viewport,
    theme,
    showGrid,
    gridSnapM,
    showSlinkyRings,
    showDimensions,
    showCorridors,
    selectedSegmentId,
    selectedObstacleId,
    hoveredHandleId,
    activeTool,
    drawingTempPoint,
  ]);

  useEffect(() => {
    triggerRender();
  }, [triggerRender]);

  // Fit View
  const handleFitView = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    // Calculate bounding box of property
    const points = state.property.points || [];
    if (points.length === 0) return;

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const spanX = Math.max(10, maxX - minX + 4);
    const spanY = Math.max(10, maxY - minY + 4);

    const scaleX = w / spanX;
    const scaleY = h / spanY;
    const fitScale = Math.min(scaleX, scaleY, 40);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setViewport({
      scale: fitScale,
      panX: w / 2 - centerX * fitScale,
      panY: h / 2 - centerY * fitScale,
    });
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (!containerRef.current) return;
    const cx = containerRef.current.clientWidth / 2;
    const cy = containerRef.current.clientHeight / 2;

    setViewport((prev) => {
      const newScale = Math.max(8, Math.min(120, prev.scale * factor));
      const newPanX = cx - (cx - prev.panX) * (newScale / prev.scale);
      const newPanY = cy - (cy - prev.panY) * (newScale / prev.scale);
      return { scale: newScale, panX: newPanX, panY: newPanY };
    });
  };

  // Wheel Zoom focused on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setViewport((prev) => {
      const newScale = Math.max(6, Math.min(120, prev.scale * zoomFactor));
      const newPanX = mouseX - (mouseX - prev.panX) * (newScale / prev.scale);
      const newPanY = mouseY - (mouseY - prev.panY) * (newScale / prev.scale);
      return { scale: newScale, panX: newPanX, panY: newPanY };
    });
  };

  // Screen to World converter helper
  const getMouseWorldPos = (e: React.MouseEvent): Point2D => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return {
      x: (sx - viewport.panX) / viewport.scale,
      y: (sy - viewport.panY) / viewport.scale,
    };
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse or Space held -> start panning
    if (e.button === 1 || e.shiftKey || activeTool === 'select' && e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
      return;
    }

    if (e.button !== 0) return; // left click only below

    const rawWorld = getMouseWorldPos(e);
    const snappedWorld = snapPointToGrid(rawWorld, gridSnapM);

    if (activeTool === 'select') {
      // 1. Check if clicking on any segment handle (within 0.6m)
      const handleRadiusM = 0.6;
      for (const seg of state.segments) {
        if (distance(rawWorld, seg.startPoint) < handleRadiusM) {
          setDraggingHandle({ segmentId: seg.id, which: 'start' });
          onSelectSegment(seg.id);
          return;
        }
        if (distance(rawWorld, seg.endPoint) < handleRadiusM) {
          setDraggingHandle({ segmentId: seg.id, which: 'end' });
          onSelectSegment(seg.id);
          return;
        }
      }

      // 2. Check if clicking on an obstacle
      for (const obs of state.obstacles) {
        if (obs.type === 'tree' || obs.type === 'cistern') {
          const center = { x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 };
          if (distance(rawWorld, center) < (obs.radius || 1.5)) {
            setSelectedObstacleId(obs.id);
            setDraggingObstacle({ id: obs.id, offsetX: rawWorld.x - obs.x, offsetY: rawWorld.y - obs.y });
            return;
          }
        } else {
          if (isPointInsideRect(rawWorld, obs)) {
            setSelectedObstacleId(obs.id);
            setDraggingObstacle({ id: obs.id, offsetX: rawWorld.x - obs.x, offsetY: rawWorld.y - obs.y });
            return;
          }
        }
      }

      // 3. Check if clicking on a segment line
      for (const seg of state.segments) {
        const { dist } = pointToSegmentDistance(rawWorld, seg.startPoint, seg.endPoint);
        if (dist < (seg.widthM || 1.2) / 2 + 0.3) {
          onSelectSegment(seg.id);
          setSelectedObstacleId(null);
          return;
        }
      }

      // Otherwise click on empty space -> start panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
      onSelectSegment(null);
      setSelectedObstacleId(null);
    } else if (activeTool === 'draw_segment') {
      // Add new segment endpoint
      const lastSeg = state.segments[state.segments.length - 1];
      const startPt = lastSeg ? lastSeg.endPoint : snappedWorld;

      if (lastSeg && distance(startPt, snappedWorld) > 0.5) {
        const segLetter = String.fromCharCode(65 + state.segments.length);
        const newSeg: TrenchSegment = {
          id: `seg_${Date.now()}`,
          name: `${segLetter} (Slinky)`,
          startPoint: { ...startPt },
          endPoint: { ...snappedWorld },
          lengthM: distance(startPt, snappedWorld),
          widthM: 1.4,
          depthM: 1.6,
          type: 'slinky',
          allocatedPipeLengthM: Math.round(distance(startPt, snappedWorld) * 4),
          loopDiameterM: 1.3,
          numberOfCircuits: state.parameters.numberOfCircuits,
        };

        onUpdateState({
          ...state,
          segments: [...state.segments, newSeg],
        });
        onSelectSegment(newSeg.id);
      }
    } else if (activeTool === 'add_house') {
      const newHouse: BuildingElement = {
        id: `house_${Date.now()}`,
        name: 'Wohnhaus',
        x: snappedWorld.x - 5,
        y: snappedWorld.y - 4,
        width: 10,
        height: 8,
        rotationDeg: 0,
        type: 'house',
      };
      onUpdateState({ ...state, obstacles: [...state.obstacles, newHouse] });
      setActiveTool('select');
    } else if (activeTool === 'add_tree') {
      const newTree: BuildingElement = {
        id: `tree_${Date.now()}`,
        name: 'Baumbestand',
        x: snappedWorld.x - 2,
        y: snappedWorld.y - 2,
        width: 4,
        height: 4,
        radius: 2.0,
        rotationDeg: 0,
        type: 'tree',
      };
      onUpdateState({ ...state, obstacles: [...state.obstacles, newTree] });
      setActiveTool('select');
    } else if (activeTool === 'add_cistern') {
      const newCistern: BuildingElement = {
        id: `cistern_${Date.now()}`,
        name: 'Regenwasserzisterne',
        x: snappedWorld.x - 1.25,
        y: snappedWorld.y - 1.25,
        width: 2.5,
        height: 2.5,
        radius: 1.25,
        rotationDeg: 0,
        type: 'cistern',
      };
      onUpdateState({ ...state, obstacles: [...state.obstacles, newCistern] });
      setActiveTool('select');
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rawWorld = getMouseWorldPos(e);
    const snappedWorld = snapPointToGrid(rawWorld, gridSnapM);
    setCursorWorld(snappedWorld);

    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
      return;
    }

    if (draggingHandle) {
      // Dragging a trench waypoint
      const updatedSegments = state.segments.map((seg, i, arr) => {
        if (seg.id === draggingHandle.segmentId) {
          const updated = { ...seg };
          if (draggingHandle.which === 'start') {
            updated.startPoint = snappedWorld;
          } else {
            updated.endPoint = snappedWorld;
          }
          const dx = updated.endPoint.x - updated.startPoint.x;
          const dy = updated.endPoint.y - updated.startPoint.y;
          updated.lengthM = Math.sqrt(dx * dx + dy * dy);
          return updated;
        }

        // Keep connected segments continuous
        const targetSeg = arr.find((s) => s.id === draggingHandle.segmentId);
        if (targetSeg) {
          if (draggingHandle.which === 'end' && seg.startPoint.x === targetSeg.endPoint.x && seg.startPoint.y === targetSeg.endPoint.y) {
            const nextUpdated = { ...seg, startPoint: snappedWorld };
            const dx = nextUpdated.endPoint.x - nextUpdated.startPoint.x;
            const dy = nextUpdated.endPoint.y - nextUpdated.startPoint.y;
            nextUpdated.lengthM = Math.sqrt(dx * dx + dy * dy);
            return nextUpdated;
          }
        }

        return seg;
      });

      onUpdateState({ ...state, segments: updatedSegments });
      return;
    }

    if (draggingObstacle) {
      const updatedObs = state.obstacles.map((obs) => {
        if (obs.id === draggingObstacle.id) {
          return {
            ...obs,
            x: snapPointToGrid({ x: rawWorld.x - draggingObstacle.offsetX, y: 0 }, gridSnapM).x,
            y: snapPointToGrid({ x: 0, y: rawWorld.y - draggingObstacle.offsetY }, gridSnapM).y,
          };
        }
        return obs;
      });
      onUpdateState({ ...state, obstacles: updatedObs });
      return;
    }

    if (activeTool === 'draw_segment') {
      setDrawingTempPoint(snappedWorld);
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingHandle(null);
    setDraggingObstacle(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool('select');
        setDrawingTempPoint(null);
      } else if (e.key === 'f' || e.key === 'F') {
        handleFitView();
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden cursor-crosshair select-none"
    >
      {/* HTML5 CAD Canvas */}
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full block"
      />

      {/* Floating CAD Action Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex items-center gap-1 z-10">
        <button
          onClick={() => { setActiveTool('select'); setDrawingTempPoint(null); }}
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            activeTool === 'select'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Auswählen & Verschieben (Esc)"
        >
          <MousePointer className="w-4 h-4" />
          <span className="hidden sm:inline">Auswählen</span>
        </button>

        <button
          onClick={() => setActiveTool('draw_segment')}
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            activeTool === 'draw_segment'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Graben zeichnen: Punkte anklicken"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Graben zeichnen</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={() => setActiveTool('add_house')}
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            activeTool === 'add_house'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Gebäude einfügen"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">Haus</span>
        </button>

        <button
          onClick={() => setActiveTool('add_tree')}
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            activeTool === 'add_tree'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Baumschutzbereich / Hindernis"
        >
          <Trees className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Baum</span>
        </button>

        <button
          onClick={() => setActiveTool('add_cistern')}
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            activeTool === 'add_cistern'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Regenwasserzisterne"
        >
          <Droplet className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Zisterne</span>
        </button>
      </div>

      {/* Floating View Controls & Snapping */}
      <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex items-center gap-1 z-10 text-xs">
        <button
          onClick={() => handleZoom(1.2)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Vergrößern (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleZoom(0.8)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Verkleinern (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleFitView}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Ansicht einpassen (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Snap selector */}
        <button
          onClick={() => setGridSnapM((prev) => (prev === 0.1 ? 0.5 : prev === 0.5 ? 1.0 : 0.1))}
          className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
          title="Raster-Fangweite umschalten (0.1m, 0.5m, 1.0m)"
        >
          Fang: {gridSnapM}m
        </button>

        <button
          onClick={() => setShowSlinkyRings((prev) => !prev)}
          className={`p-1.5 rounded-lg border transition ${
            showSlinkyRings ? 'bg-sky-600/20 border-sky-500/40 text-sky-400' : 'border-transparent text-slate-400'
          }`}
          title="Slinky-Rohrschlaufen ein-/ausblenden"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowDimensions((prev) => !prev)}
          className={`p-1.5 rounded-lg border transition ${
            showDimensions ? 'bg-sky-600/20 border-sky-500/40 text-sky-400' : 'border-transparent text-slate-400'
          }`}
          title="Maßketten ein-/ausblenden"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Status / Coordinate Readout */}
      <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 flex items-center gap-3 z-10 shadow-lg">
        <span className="text-slate-400">Position:</span>
        <span className="text-sky-400 font-bold">X: {cursorWorld.x.toFixed(2)} m</span>
        <span className="text-sky-400 font-bold">Y: {cursorWorld.y.toFixed(2)} m</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Zoom: {viewport.scale.toFixed(1)} px/m</span>
      </div>

      {/* Tool hint notification */}
      {activeTool === 'draw_segment' && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-sky-950/90 border border-sky-500/50 text-sky-200 text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 z-20 animate-in fade-in slide-in-from-bottom-2">
          <Plus className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>Graben zeichnen: Klicken Sie auf die gewünschten Eckpunkte im Grundstück. Drücken Sie <strong>Esc</strong> zum Beenden.</span>
        </div>
      )}
    </div>
  );
};
