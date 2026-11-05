import React, { useState } from 'react';
import { X, Activity, Gauge, Droplets, Info } from 'lucide-react';
import { RgkProjectState, SimulationResults } from '../types';
import { calculateHydraulics, getBrineProperties } from '../core/hydraulics';
import { PIPE_SPECS } from '../core/pipes';

interface HydraulicModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: RgkProjectState;
  simulation: SimulationResults;
}

export const HydraulicModal: React.FC<HydraulicModalProps> = ({
  isOpen,
  onClose,
  state,
  simulation,
}) => {
  const [testTempC, setTestTempC] = useState<number>(0.0);
  const [customGlycol, setCustomGlycol] = useState<number>(state.parameters.brineGlycolPercent || 25);

  if (!isOpen) return null;

  const { parameters } = state;
  const pipeSpec = PIPE_SPECS[parameters.pipeType];

  const hyd = calculateHydraulics({
    pipeType: parameters.pipeType,
    numberOfCircuits: parameters.numberOfCircuits,
    circuitLengthM: parameters.pipeLengthPerCircuitM,
    coolingCapacityKw: simulation.requiredCoolingCapacityKw,
    brineTempSpreadK: parameters.brineTempSpreadK,
    glycolPercentage: customGlycol,
    temperatureC: testTempC,
  });

  // Calculate curve points for temperature from -6°C to +10°C
  const tempPoints = [-6, -4, -2, 0, 2, 5, 8, 10];
  const curveData = tempPoints.map((t) => {
    const res = calculateHydraulics({
      pipeType: parameters.pipeType,
      numberOfCircuits: parameters.numberOfCircuits,
      circuitLengthM: parameters.pipeLengthPerCircuitM,
      coolingCapacityKw: simulation.requiredCoolingCapacityKw,
      brineTempSpreadK: parameters.brineTempSpreadK,
      glycolPercentage: customGlycol,
      temperatureC: t,
    });
    const props = getBrineProperties(customGlycol, t);
    return {
      temp: t,
      reynolds: res.reynoldsNumber,
      pressureDropKPa: res.totalPressureDropKPa,
      viscosityMpaS: props.dynamicViscosity * 1000,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Hydraulik- & Strömungsanalyse</h2>
              <p className="text-xs text-slate-400">
                Reynolds-Zahl, Druckverlust und Viskositätsverlauf des PE 100-RC Rohrkreises
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Reynolds-Zahl (Re)</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {hyd.reynoldsNumber.toFixed(0)}
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    hyd.flowRegime === 'turbulent'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : hyd.flowRegime === 'transitional'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {hyd.flowRegime === 'turbulent' ? 'Turbulent (Optimal)' : hyd.flowRegime === 'transitional' ? 'Übergangsbereich' : 'Laminar'}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Gesamtdruckverlust</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                {hyd.totalPressureDropKPa.toFixed(1)} kPa
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {hyd.totalPressureDropMbar.toFixed(0)} mbar | {hyd.pumpHeadMwc.toFixed(2)} mWS
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Volumenstrom je Kreis</span>
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {hyd.circuitFlowLmin.toFixed(1)} L/min
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Gesamt: {hyd.totalFlowM3h.toFixed(2)} m³/h
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Fließgeschwindigkeit (v)</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {hyd.velocityMs.toFixed(2)} m/s
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Pumpenleistung: ~{hyd.pumpPowerWatts.toFixed(0)} W
              </div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/80 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Betriebs-Soletemperatur</span>
                <span className="font-mono font-bold text-sky-400">{testTempC.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="-6"
                max="10"
                step="0.5"
                value={testTempC}
                onChange={(e) => setTestTempC(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>-6 °C (Extremwinter)</span>
                <span>0 °C (Normauslegung)</span>
                <span>+10 °C (Sommerregenerierung)</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Glykolgehalt (Monopropylenglykol)</span>
                <span className="font-mono font-bold text-sky-400">{customGlycol} %</span>
              </div>
              <input
                type="range"
                min="18"
                max="32"
                step="1"
                value={customGlycol}
                onChange={(e) => setCustomGlycol(parseInt(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>18% (-8°C Frostschutz)</span>
                <span>25% (-14°C VDI Standard)</span>
                <span>32% (-18°C)</span>
              </div>
            </div>
          </div>

          {/* Temperature Behavior Curve Table */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/80 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 text-xs font-semibold text-white">
              Temperaturabhängiges Betriebsverhalten ({pipeSpec.name}, {parameters.pipeLengthPerCircuitM}m Kreis)
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700 font-mono text-[10px] uppercase">
                <tr>
                  <th className="px-4 py-2">Soletemp. (°C)</th>
                  <th className="px-4 py-2">Viskosität (mPa·s)</th>
                  <th className="px-4 py-2">Reynolds (Re)</th>
                  <th className="px-4 py-2">Strömungszustand</th>
                  <th className="px-4 py-2 text-right">Druckverlust (kPa)</th>
                  <th className="px-4 py-2 text-right">Förderhöhe (mWS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {curveData.map((pt) => {
                  const isCurrent = Math.abs(pt.temp - testTempC) < 1.0;
                  return (
                    <tr key={pt.temp} className={isCurrent ? 'bg-sky-500/10 font-bold text-white' : ''}>
                      <td className="px-4 py-2">{pt.temp > 0 ? `+${pt.temp}` : pt.temp} °C</td>
                      <td className="px-4 py-2">{pt.viscosityMpaS.toFixed(2)}</td>
                      <td className="px-4 py-2">{pt.reynolds.toFixed(0)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            pt.reynolds >= 3500 ? 'text-emerald-400 bg-emerald-500/10' : pt.reynolds >= 2300 ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {pt.reynolds >= 3500 ? 'Turbulent' : pt.reynolds >= 2300 ? 'Übergang' : 'Laminar'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-amber-300">{pt.pressureDropKPa.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right">{(pt.pressureDropKPa / 9.81).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Technical Guidance */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 flex items-start gap-3 text-xs text-slate-300">
            <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white">Hydraulische Auslegungsregeln für Ringgrabenkollektoren:</span>
              <p>
                1. <strong>Druckverlust-Grenze:</strong> Der Gesamtdruckverlust (Rohr + Soleverteiler) sollte bei 0°C unter 35–38 kPa liegen, damit die integrierte Hocheffizienz-Umwälzpumpe der Wärmepumpe mit minimalem Hilfsstromverbrauch (~25–50 Watt) betrieben werden kann.
              </p>
              <p>
                2. <strong>Turbulente Strömung vs. Slinky-Vorteil:</strong> Im geraden Rohr beginnt Turbulenz ab Re &gt; 2300. In Slinky-Rohren wird durch die permanente Krümmung (Dean-Wirbel) bereits ab Re ≈ 1800 ein ausgezeichneter Wärmeübergang gewährleistet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
