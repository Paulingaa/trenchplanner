import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Activity,
  Gauge,
  Thermometer,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  TrenchSegment,
  SegmentType,
  SimulationResults,
  Language,
} from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface SidebarRightProps {
  segments: TrenchSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  onUpdateSegment: (updated: TrenchSegment) => void;
  onAddSegment: () => void;
  onDeleteSegment: (id: string) => void;
  simulation: SimulationResults;
  lang: Language;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onUpdateSegment,
  onAddSegment,
  onDeleteSegment,
  simulation,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const selectedResult = selectedSegment
    ? simulation.segmentResults.find((r) => r.segmentId === selectedSegment.id)
    : null;

  const coverage = simulation.coverageRatioPercent;
  const isOptimal = coverage >= 105;
  const isSufficient = coverage >= 99.5;

  return (
    <aside className="w-84 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto select-none shrink-0 text-slate-300 text-xs">
      {/* 1. Thermal Coverage Gauge Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {t.coverage}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isOptimal
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isSufficient
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isOptimal ? t.statusOptimal : isSufficient ? t.statusSufficient : t.statusUndersized}
          </span>
        </div>

        {/* Progress Bar & Big Number */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-mono font-black text-white">
              {coverage.toFixed(0)} <span className="text-lg font-normal text-slate-400">%</span>
            </span>
            <span className="font-mono text-xs text-slate-400">
              <strong className="text-white">{simulation.totalTrenchExtractionKw.toFixed(2)} kW</strong> / {simulation.requiredCoolingCapacityKw.toFixed(2)} kW
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOptimal
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : isSufficient
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, coverage)}%` }}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px]">{t.trenchLength}</span>
            <span className="font-mono font-bold text-white">{simulation.totalTrenchLengthM.toFixed(1)} m</span>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px]">{t.annualYield}</span>
            <span className="font-mono font-bold text-sky-400">~{simulation.annualGroundExtractionKwh.toFixed(0)} kWh/a</span>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px]">{t.reynoldsNumber}</span>
            <span className="font-mono font-bold text-emerald-400">Re = {simulation.reynoldsNumber.toFixed(0)}</span>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px]">{t.pressureDrop}</span>
            <span className="font-mono font-bold text-amber-300">{simulation.totalPressureDropKPa.toFixed(1)} kPa</span>
          </div>
        </div>
      </div>

      {/* 2. Selected Segment Inspector */}
      {selectedSegment ? (
        <div className="p-4 border-b border-slate-800 bg-slate-800/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Abschnitt: {selectedSegment.name}</span>
            </div>
            <button
              onClick={() => onDeleteSegment(selectedSegment.id)}
              className="text-slate-400 hover:text-rose-400 transition p-1"
              title={t.deleteSegment}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{t.segmentName}</label>
              <input
                type="text"
                value={selectedSegment.name}
                onChange={(e) => onUpdateSegment({ ...selectedSegment, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{t.segmentType}</label>
              <select
                value={selectedSegment.type}
                onChange={(e) =>
                  onUpdateSegment({
                    ...selectedSegment,
                    type: e.target.value as SegmentType,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-sky-500 outline-none"
              >
                <option value="slinky">Slinky (Überlappende Schlaufen)</option>
                <option value="straight">Gerade Verlegung</option>
                <option value="connection_cold">Anbindung Kalt (Vorlauf)</option>
                <option value="connection_warm">Anbindung Warm (Rücklauf)</option>
                <option value="connection_insulated">Anbindung Gedämmt (Hausnah)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.widthM}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.5"
                  value={selectedSegment.widthM}
                  onChange={(e) =>
                    onUpdateSegment({
                      ...selectedSegment,
                      widthM: parseFloat(e.target.value) || 1.2,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.depthM}</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="2.5"
                  value={selectedSegment.depthM}
                  onChange={(e) =>
                    onUpdateSegment({
                      ...selectedSegment,
                      depthM: parseFloat(e.target.value) || 1.5,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>{t.pipeM}</span>
                <span className="font-mono text-white font-bold">{selectedSegment.allocatedPipeLengthM} m</span>
              </div>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={selectedSegment.allocatedPipeLengthM}
                onChange={(e) =>
                  onUpdateSegment({
                    ...selectedSegment,
                    allocatedPipeLengthM: parseInt(e.target.value),
                  })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Calculated Loop Pitch & Thermal Extraction */}
            {selectedResult && (
              <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Wärmeentzug Abschnitt:</span>
                  <span className="font-mono font-bold text-sky-400">
                    {selectedResult.extractionKw.toFixed(2)} kW ({selectedResult.specificWm.toFixed(0)} W/m)
                  </span>
                </div>
                {selectedSegment.type === 'slinky' && (
                  <div className="flex justify-between text-slate-300">
                    <span>Slinky-Schlaufen & Vorschub:</span>
                    <span className="font-mono text-emerald-400">
                      {selectedResult.loopCount} Schlaufen ({selectedResult.loopSpacingCm} cm Abstand)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-800 bg-slate-800/10 text-center text-slate-400 text-xs">
          Wählen Sie einen Grabenabschnitt im Lageplan an, um Breite, Tiefe und Rohrmeter zu konfigurieren.
        </div>
      )}

      {/* 3. Trench Segments Sequence */}
      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {t.segmentsTitle} ({segments.length})
          </span>
          <button
            onClick={onAddSegment}
            className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Neu</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {segments.map((seg, idx) => {
            const isSelected = selectedSegmentId === seg.id;
            const res = simulation.segmentResults.find((r) => r.segmentId === seg.id);

            return (
              <div
                key={seg.id}
                onClick={() => onSelectSegment(seg.id)}
                className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-sky-600/20 border-sky-500 text-white'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-xs truncate flex items-center gap-1.5">
                    <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-700 text-slate-300">
                      #{idx + 1}
                    </span>
                    <span>{seg.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {seg.lengthM.toFixed(1)}m · {seg.widthM.toFixed(1)}m B · {seg.allocatedPipeLengthM}m Rohr
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sky-400 text-xs">
                    {res ? `${res.extractionKw.toFixed(2)} kW` : '-'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {seg.type === 'slinky' ? 'Slinky' : 'Gerade'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Warnings and Notes */}
        {simulation.warnings.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Planungshinweise</span>
            </div>
            {simulation.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-amber-200/90 leading-tight">
                • {w}
              </p>
            ))}
          </div>
        )}

        {simulation.recommendations.length > 0 && (
          <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Optimierung</span>
            </div>
            {simulation.recommendations.map((r, i) => (
              <p key={i} className="text-[11px] text-emerald-200/90 leading-tight">
                • {r}
              </p>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
