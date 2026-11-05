import React, { useRef, useEffect, useState } from 'react';
import { X, Layers, Thermometer, ShieldCheck } from 'lucide-react';
import { TrenchSegment, SoilType } from '../types';
import { SOIL_SPECS } from '../core/soils';

interface CrossSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: TrenchSegment | null;
  defaultSoil: SoilType;
}

export const CrossSectionModal: React.FC<CrossSectionModalProps> = ({
  isOpen,
  onClose,
  segment,
  defaultSoil,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [widthM, setWidthM] = useState<number>(segment?.widthM || 1.4);
  const [depthM, setDepthM] = useState<number>(segment?.depthM || 1.6);
  const [showIsotherms, setShowIsotherms] = useState<boolean>(true);

  useEffect(() => {
    if (segment) {
      setWidthM(segment.widthM || 1.4);
      setDepthM(segment.depthM || 1.6);
    }
  }, [segment]);

  const activeSoil = segment?.soilOverride || defaultSoil;
  const soilSpec = SOIL_SPECS[activeSoil];

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background sky / atmosphere
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Coordinate mapping
    // Ground level at y = 70px
    const groundY = 75;
    // Scale: pixels per meter
    const pxPerMeter = 130;
    const centerX = w / 2;

    // 1. Soil Ground Mass
    ctx.fillStyle = soilSpec.color + '33';
    ctx.fillRect(0, groundY, w, h - groundY);

    // 2. Topsoil (Humus) layer 0 to 0.30 m
    const humusH = 0.30 * pxPerMeter;
    ctx.fillStyle = 'rgba(74, 53, 33, 0.45)';
    ctx.fillRect(0, groundY, w, humusH);

    // 3. Ground surface line (GOK) & Grass
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, groundY - 4, w, 4);

    // Ground level label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('±0.00 m GOK (Geländeoberkante)', 15, groundY - 10);

    // 4. Trench Excavation (Grabenprofil mit Böschungswinkel DIN 4124)
    const trenchDepthPx = depthM * pxPerMeter;
    const trenchBottomY = groundY + trenchDepthPx;
    const trenchWidthPx = widthM * pxPerMeter;
    // Slight excavation batter slope (~80 deg)
    const batterPx = trenchDepthPx * 0.15;

    const tLeftTop = centerX - trenchWidthPx / 2 - batterPx;
    const tRightTop = centerX + trenchWidthPx / 2 + batterPx;
    const tLeftBottom = centerX - trenchWidthPx / 2;
    const tRightBottom = centerX + trenchWidthPx / 2;

    // Isotherms (Heat Extraction Envelope)
    if (showIsotherms) {
      ctx.save();
      const numIsotherms = 5;
      for (let i = numIsotherms; i >= 1; i--) {
        const radX = (trenchWidthPx / 2 + i * 28);
        const radY = (trenchDepthPx / 2 + i * 22);
        const isoY = groundY + trenchDepthPx * 0.65;

        ctx.beginPath();
        ctx.ellipse(centerX, isoY, radX, radY, 0, 0, Math.PI);
        // Temperature gradient from cold trench (-1.5°C) to undisturbed ground (+8°C)
        const temp = -1.5 + (i / numIsotherms) * 9.5;
        ctx.fillStyle = `rgba(56, 189, 248, ${0.08 / i})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 / i})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`${temp.toFixed(1)}°C`, centerX + radX - 10, isoY);
      }
      ctx.restore();
    }

    // Trench Cut Body
    ctx.beginPath();
    ctx.moveTo(tLeftTop, groundY);
    ctx.lineTo(tLeftBottom, trenchBottomY);
    ctx.lineTo(tRightBottom, trenchBottomY);
    ctx.lineTo(tRightTop, groundY);
    ctx.closePath();

    ctx.fillStyle = 'rgba(23, 37, 84, 0.6)'; // excavation interior
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Sand bedding layer (Grabensohle 10 cm steinfreier Sand)
    const sandBeddingPx = 0.12 * pxPerMeter;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
    ctx.fillRect(tLeftBottom, trenchBottomY - sandBeddingPx, trenchWidthPx, sandBeddingPx);

    // 6. Pipes Section (Slinky loop coils laying flat on trench bed)
    const pipeDiaPx = 0.032 * pxPerMeter;
    const numDrawnPipes = Math.min(8, Math.max(4, Math.round(widthM * 4)));
    const pipeSpacing = trenchWidthPx / (numDrawnPipes + 1);

    for (let p = 1; p <= numDrawnPipes; p++) {
      const px = tLeftBottom + p * pipeSpacing;
      const py = trenchBottomY - sandBeddingPx / 2;

      // Pipe outer wall PE100-RC
      ctx.beginPath();
      ctx.arc(px, py, pipeDiaPx, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fluid core (Brine / Sole)
      ctx.beginPath();
      ctx.arc(px, py, pipeDiaPx * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
    }

    // 7. Warning Tape (Trassenwarnband at -0.50 m)
    const tapeY = groundY + 0.50 * pxPerMeter;
    const tapeWidthPx = Math.min(trenchWidthPx * 0.8, 180);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(centerX - tapeWidthPx / 2, tapeY - 3, tapeWidthPx, 6);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - tapeWidthPx / 2, tapeY - 3, tapeWidthPx, 6);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ TRASSENWARNBAND ERDWÄRME (-0.50m)', centerX, tapeY + 2);

    // 8. Dimension Lines
    // Depth dimension
    const dimX = tLeftTop - 35;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dimX, groundY);
    ctx.lineTo(dimX, trenchBottomY);
    ctx.moveTo(dimX - 5, groundY);
    ctx.lineTo(dimX + 5, groundY);
    ctx.moveTo(dimX - 5, trenchBottomY);
    ctx.lineTo(dimX + 5, trenchBottomY);
    ctx.stroke();

    ctx.save();
    ctx.translate(dimX - 10, groundY + trenchDepthPx / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Grabentiefe: -${depthM.toFixed(2)} m`, 0, 0);
    ctx.restore();

    // Width dimension
    const dimY = trenchBottomY + 25;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tLeftBottom, dimY);
    ctx.lineTo(tRightBottom, dimY);
    ctx.moveTo(tLeftBottom, dimY - 5);
    ctx.lineTo(tLeftBottom, dimY + 5);
    ctx.moveTo(tRightBottom, dimY - 5);
    ctx.lineTo(tRightBottom, dimY + 5);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Grabenbreite: ${widthM.toFixed(2)} m`, centerX, dimY + 16);

  }, [isOpen, widthM, depthM, showIsotherms, activeSoil, soilSpec]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Grabenquerschnitt & Erd-Isothermen</h2>
              <p className="text-xs text-slate-400">
                Profilansicht nach VDI 4640 & DIN 4124 Baugruben und Gräben
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col lg:flex-row gap-6">
          {/* Canvas Viewport */}
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col items-center">
            <canvas
              ref={canvasRef}
              className="w-full h-80 block"
            />
          </div>

          {/* Controls & Specs */}
          <div className="w-full lg:w-72 flex flex-col gap-4 text-sm">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Geometrie anpassen
              </span>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Grabenbreite</span>
                  <span className="font-mono font-bold text-sky-400">{widthM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.4"
                  step="0.1"
                  value={widthM}
                  onChange={(e) => setWidthM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Grabentiefe</span>
                  <span className="font-mono font-bold text-sky-400">-{depthM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={depthM}
                  onChange={(e) => setDepthM(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mt-2 pt-2 border-t border-slate-700">
                <input
                  type="checkbox"
                  checked={showIsotherms}
                  onChange={(e) => setShowIsotherms(e.target.checked)}
                  className="accent-sky-500 rounded"
                />
                <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                <span>Wärmeentzugs-Isothermen einblenden</span>
              </label>
            </div>

            {/* Soil & Safety Specs */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Bodeneigenschaften
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block"
                  style={{ backgroundColor: soilSpec.color }}
                />
                <span className="font-medium text-white">{soilSpec.nameDe}</span>
              </div>
              <p className="text-xs text-slate-400">{soilSpec.descriptionDe}</p>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700 text-xs">
                <div>
                  <div className="text-slate-400">Wärmeleitfähigkeit</div>
                  <div className="font-mono text-white">{soilSpec.thermalConductivity} W/(m·K)</div>
                </div>
                <div>
                  <div className="text-slate-400">Wärmekapazität</div>
                  <div className="font-mono text-white">{soilSpec.heatCapacityVolumetric} MJ/(m³·K)</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Frostgrenze (~0.8–1.0 m) wird mit {depthM.toFixed(1)} m Tiefe sicher unterschritten. Das Erdreich regeneriert im Sommer vollständig durch Niederschlag und Solarstrahlung.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
