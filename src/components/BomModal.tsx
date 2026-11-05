import React from 'react';
import { X, ShoppingCart, Calculator, Download, CheckCircle2, TrendingDown } from 'lucide-react';
import { RgkProjectState, SimulationResults } from '../types';
import { PIPE_SPECS } from '../core/pipes';

interface BomModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: RgkProjectState;
  simulation: SimulationResults;
}

export const BomModal: React.FC<BomModalProps> = ({
  isOpen,
  onClose,
  state,
  simulation,
}) => {
  if (!isOpen) return null;

  const { parameters, segments } = state;
  const pipeSpec = PIPE_SPECS[parameters.pipeType];

  // 1. Excavation volume calculation
  let totalSolidExcavationM3 = 0;
  let totalSandBeddingM3 = 0;
  let totalTrenchLenM = 0;

  for (const seg of segments) {
    const len = seg.lengthM || 10;
    const w = seg.widthM || 1.2;
    const d = seg.depthM || 1.5;
    totalSolidExcavationM3 += len * w * d;
    totalSandBeddingM3 += len * w * 0.10;
    totalTrenchLenM += len;
  }

  // Loose soil expansion factor (Auflockerungsfaktor ~1.25)
  const looseSoilM3 = totalSolidExcavationM3 * 1.25;

  // 2. Brine fluid volume
  const totalPipeM = parameters.numberOfCircuits * parameters.pipeLengthPerCircuitM;
  const pipeFluidLiters = totalPipeM * pipeSpec.volumePerMeterLiters;
  // Add 30 L for heat pump heat exchanger, manifold, and expansion vessel
  const totalSystemLiters = pipeFluidLiters + 30;
  const glycolFraction = parameters.brineGlycolPercent / 100;
  const pureGlycolLiters = totalSystemLiters * glycolFraction;
  const canisters20L = Math.ceil(pureGlycolLiters / 20);

  // 3. Costs Estimation
  const pipePricePerMeter = parameters.pipeType === 'PE100RC_32' ? 1.75 : 2.65;
  const pipeTotalCost = totalPipeM * pipePricePerMeter;
  const manifoldCost = parameters.numberOfCircuits === 1 ? 220 : parameters.numberOfCircuits === 2 ? 460 : 680;
  const glycolCost = canisters20L * 72; // ~72€ per 20L canister
  const sandCost = totalSandBeddingM3 * 35; // ~35€ per m3 sand
  const warningTapeCost = Math.ceil(totalTrenchLenM / 100) * 28;
  const wallPenetrationCost = parameters.numberOfCircuits * 2 * 65; // Ringraumdichtungen
  const miscCost = 180; // Cable ties, clamps, pressure testing fluid

  const materialSubtotal = pipeTotalCost + manifoldCost + glycolCost + sandCost + warningTapeCost + wallPenetrationCost + miscCost;

  // DIY scenario (Baggermiete 3-5 Tage, Eigenleistung)
  const diyExcavatorCost = 1200;
  const diyTotal = materialSubtotal + diyExcavatorCost;

  // Professional contractor excavation & installation
  const contractorExcavationCost = totalSolidExcavationM3 * 38; // ~38€/m3 excavation & backfill
  const contractorLaborCost = 2200;
  const contractorTotal = materialSubtotal + contractorExcavationCost + contractorLaborCost;

  // Benchmark: Deep borehole drilling (Erdsondenbohrung 2x 80m @ 105€/m inkl. Genehmigung)
  const boreholeReferenceCost = Math.max(14000, simulation.requiredCoolingCapacityKw * 1850);
  const diySavings = boreholeReferenceCost - diyTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Stückliste, Aushub & Kostenschätzung</h2>
              <p className="text-xs text-slate-400">
                Materialbedarf, Erdaushubvolumen und Kostenvergleich gegenüber Tiefenbohrung
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Gesamtes Aushubvolumen</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {totalSolidExcavationM3.toFixed(1)} m³
              </div>
              <div className="text-[11px] text-slate-500">Gelockert: ~{looseSoilM3.toFixed(1)} m³</div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Sohl-Sandbett (10 cm)</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {totalSandBeddingM3.toFixed(1)} m³
              </div>
              <div className="text-[11px] text-slate-500">Steinfreier Sand / Feinboden</div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Solevumen (Gesamt)</div>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {totalSystemLiters.toFixed(0)} Liter
              </div>
              <div className="text-[11px] text-slate-500">davon {pureGlycolLiters.toFixed(0)}L Glykol ({parameters.brineGlycolPercent}%)</div>
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
              <div className="text-xs text-emerald-400 font-medium">Ersparnis vs. Bohrung</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                ca. €{diySavings.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-emerald-400/80">bei Ausführung in Eigenleistung</div>
            </div>
          </div>

          {/* Bill of Materials Table */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/80 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
              <span className="text-sm font-semibold text-white">Detaillierte Material-Stückliste</span>
              <span className="text-xs font-mono text-slate-400">PE 100-RC Qualitätsstandard</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700 font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Position</th>
                  <th className="px-4 py-2.5">Spezifikation</th>
                  <th className="px-4 py-2.5 text-right">Menge</th>
                  <th className="px-4 py-2.5 text-right">Einzelpreis (ca.)</th>
                  <th className="px-4 py-2.5 text-right">Gesamt (ca.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Erdwärmerohr-Bund</td>
                  <td className="px-4 py-2.5">{pipeSpec.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{parameters.numberOfCircuits} × {parameters.pipeLengthPerCircuitM} m</td>
                  <td className="px-4 py-2.5 text-right font-mono">€{pipePricePerMeter.toFixed(2)}/m</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{pipeTotalCost.toFixed(0)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Sole-Verteilerstation</td>
                  <td className="px-4 py-2.5">{parameters.numberOfCircuits}-fach mit Durchflussmessern (Tacosetter), Kugelhähnen & Halterung</td>
                  <td className="px-4 py-2.5 text-right font-mono">1 Stk.</td>
                  <td className="px-4 py-2.5 text-right font-mono">€{manifoldCost}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{manifoldCost}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Sole-Frostschutzkonzentrat</td>
                  <td className="px-4 py-2.5">Monopropylenglykol / Ethylenglykol (20L Kanister, 25% Auslegung)</td>
                  <td className="px-4 py-2.5 text-right font-mono">{canisters20L} Kanister</td>
                  <td className="px-4 py-2.5 text-right font-mono">€72,00</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{glycolCost}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Sohl-Sandbettung</td>
                  <td className="px-4 py-2.5">0/2 oder 0/4 Rundkornsand steinfrei zum Rohrschutz</td>
                  <td className="px-4 py-2.5 text-right font-mono">{totalSandBeddingM3.toFixed(1)} m³</td>
                  <td className="px-4 py-2.5 text-right font-mono">€35,00/m³</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{sandCost.toFixed(0)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Trassenwarnband</td>
                  <td className="px-4 py-2.5">Gelb, mit Aufdruck "Achtung Erdwärmeleitung" (Verlegung bei -0.50m)</td>
                  <td className="px-4 py-2.5 text-right font-mono">{Math.ceil(totalTrenchLenM / 100) * 100} m</td>
                  <td className="px-4 py-2.5 text-right font-mono">€28,00/Rolle</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{warningTapeCost}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Hauseinführungsdichtungen</td>
                  <td className="px-4 py-2.5">Ringraumdichtungen druckwasserdicht für Vor-/Rücklauf</td>
                  <td className="px-4 py-2.5 text-right font-mono">{parameters.numberOfCircuits * 2} Stk.</td>
                  <td className="px-4 py-2.5 text-right font-mono">€65,00</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{wallPenetrationCost}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-white">Montagezubehör</td>
                  <td className="px-4 py-2.5">Kabelbinder UV-beständig, Rohrmarkierer, Prüfdruck-Adapter</td>
                  <td className="px-4 py-2.5 text-right font-mono">1 Set</td>
                  <td className="px-4 py-2.5 text-right font-mono">€{miscCost}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">€{miscCost}</td>
                </tr>
                <tr className="bg-slate-800/80 font-bold text-white text-xs">
                  <td colSpan={4} className="px-4 py-3 text-right">Zwischensumme Material (inkl. MwSt.):</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">€{materialSubtotal.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comparison: DIY vs Contractor vs Deep Borehole */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* DIY Option */}
            <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ausführung Eigenleistung</span>
                </div>
                <p className="text-slate-400 mt-1">
                  Bagger mieten (5t Minibagger ~3 Tage) + Freunde/Familie zum Rohreinlegen.
                </p>
                <div className="mt-3 space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Material:</span>
                    <span className="font-mono">€{materialSubtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minibagger Miete:</span>
                    <span className="font-mono">€{diyExcavatorCost}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-baseline font-bold">
                <span className="text-white text-sm">Gesamtkosten:</span>
                <span className="text-emerald-400 text-base font-mono">ca. €{diyTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Contractor Option */}
            <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Calculator className="w-4 h-4" />
                  <span>Komplett Tiefbauunternehmen</span>
                </div>
                <p className="text-slate-400 mt-1">
                  Erdaushub, Einsanden, Verlegung und Verfüllung durch Erdbauer.
                </p>
                <div className="mt-3 space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Material:</span>
                    <span className="font-mono">€{materialSubtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bagger & Arbeitslohn:</span>
                    <span className="font-mono">€{(contractorExcavationCost + contractorLaborCost).toFixed(0)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-baseline font-bold">
                <span className="text-white text-sm">Gesamtkosten:</span>
                <span className="text-white text-base font-mono">ca. €{contractorTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Borehole comparison */}
            <div className="bg-slate-800/40 border border-rose-500/30 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>Vergleich: Erdsondenbohrung</span>
                </div>
                <p className="text-slate-400 mt-1">
                  Klassische Tiefenbohrung inkl. behördlicher Genehmigung & Verpressung.
                </p>
                <div className="mt-3 space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Bohrmeter (~160m):</span>
                    <span className="font-mono">€{(boreholeReferenceCost * 0.85).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gutachten & Anträge:</span>
                    <span className="font-mono">€{(boreholeReferenceCost * 0.15).toFixed(0)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-baseline font-bold">
                <span className="text-slate-400 text-sm">Bohrung Kosten:</span>
                <span className="text-rose-400 text-base font-mono">ca. €{boreholeReferenceCost.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
