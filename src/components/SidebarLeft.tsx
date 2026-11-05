import React, { useState } from 'react';
import {
  MapPin,
  Flame,
  ThermometerSnowflake,
  Shovel,
  Pipette,
  Layers,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ProjectParameters, PipeType, SoilType, Language } from '../types';
import { SOIL_SPECS } from '../core/soils';
import { PIPE_SPECS } from '../core/pipes';
import { CLIMATE_PRESETS, findClimateByPlzOrCity } from '../core/climate';
import { TRANSLATIONS } from '../i18n/translations';

interface SidebarLeftProps {
  parameters: ProjectParameters;
  onChangeParameters: (params: ProjectParameters) => void;
  lang: Language;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  parameters,
  onChangeParameters,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const [plzSearch, setPlzSearch] = useState(parameters.postalCode || '');

  // Collapse states for accordion sections
  const [openSections, setOpenSections] = useState({
    climate: true,
    heating: true,
    heatpump: true,
    soil: true,
    pipe: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePlzChange = (val: string) => {
    setPlzSearch(val);
    const match = findClimateByPlzOrCity(val);
    if (match) {
      onChangeParameters({
        ...parameters,
        postalCode: match.plz,
        city: match.city,
        designOutdoorTempC: match.designOutdoorTempC,
      });
    } else {
      onChangeParameters({
        ...parameters,
        postalCode: val,
      });
    }
  };

  const dhwKw = parameters.includeDhw
    ? parameters.numberOfResidents * parameters.domesticHotWaterPerPersonKw
    : 0;
  const totalLoadKw = parameters.buildingHeatingLoadKw + dhwKw;
  const requiredCoolingKw = totalLoadKw * (1 - 1 / Math.max(1.1, parameters.heatPumpCop));

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-y-auto select-none shrink-0 text-slate-300 text-xs">
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 font-semibold text-white flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-mono text-slate-400">
          {t.paramsTitle}
        </span>
      </div>

      <div className="divide-y divide-slate-800">
        {/* 1. Location & Climate */}
        <div>
          <button
            onClick={() => toggleSection('climate')}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition font-medium text-slate-200"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Standort & Klimadaten</span>
            </div>
            {openSections.climate ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.climate && (
            <div className="p-4 space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.postalCode}</label>
                <input
                  type="text"
                  placeholder="z.B. 80331 oder München"
                  value={plzSearch}
                  onChange={(e) => handlePlzChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:border-sky-500 outline-none text-xs"
                />
                {parameters.city && (
                  <div className="text-[11px] text-sky-400 mt-1">
                    ✓ {parameters.city} ({parameters.designOutdoorTempC}°C Norm-AT)
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t.designTemp}</span>
                  <span className="font-mono font-bold text-sky-400">{parameters.designOutdoorTempC.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min="-18"
                  max="-10"
                  step="0.5"
                  value={parameters.designOutdoorTempC}
                  onChange={(e) =>
                    onChangeParameters({
                      ...parameters,
                      designOutdoorTempC: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                  <span>-18 °C (Gebirge)</span>
                  <span>-12 °C (Standard)</span>
                  <span>-10 °C (Mild)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Building & Heating Demand */}
        <div>
          <button
            onClick={() => toggleSection('heating')}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition font-medium text-slate-200"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Gebäude & Heizlast</span>
            </div>
            {openSections.heating ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.heating && (
            <div className="p-4 space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t.buildingHeatLoad}</span>
                  <span className="font-mono font-bold text-white">{parameters.buildingHeatingLoadKw.toFixed(1)} kW</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="18.0"
                  step="0.2"
                  value={parameters.buildingHeatingLoadKw}
                  onChange={(e) =>
                    onChangeParameters({
                      ...parameters,
                      buildingHeatingLoadKw: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Hot Water surcharge */}
              <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/60 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">Warmwasserzuschlag</span>
                  <input
                    type="checkbox"
                    checked={parameters.includeDhw}
                    onChange={(e) =>
                      onChangeParameters({
                        ...parameters,
                        includeDhw: e.target.checked,
                      })
                    }
                    className="accent-amber-500 rounded"
                  />
                </label>

                {parameters.includeDhw && (
                  <div className="pt-2 border-t border-slate-700/60 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">{parameters.numberOfResidents} Personen</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            onClick={() =>
                              onChangeParameters({
                                ...parameters,
                                numberOfResidents: num,
                              })
                            }
                            className={`w-5 h-5 rounded text-[10px] font-bold ${
                              parameters.numberOfResidents === num
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      +{(parameters.numberOfResidents * parameters.domesticHotWaterPerPersonKw).toFixed(2)} kW (0,20 kW/Person)
                    </div>
                  </div>
                )}
              </div>

              {/* Total load display */}
              <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex justify-between items-center">
                <span className="text-slate-400 font-medium">{t.totalHeatLoad}:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {totalLoadKw.toFixed(2)} kW
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Heat Pump & Hydraulics Parameters */}
        <div>
          <button
            onClick={() => toggleSection('heatpump')}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition font-medium text-slate-200"
          >
            <div className="flex items-center gap-2">
              <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
              <span>Wärmepumpe & Kälteleistung</span>
            </div>
            {openSections.heatpump ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.heatpump && (
            <div className="p-4 space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t.heatPumpCop}</span>
                  <span className="font-mono font-bold text-white">{parameters.heatPumpCop.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="3.8"
                  max="5.4"
                  step="0.1"
                  value={parameters.heatPumpCop}
                  onChange={(e) =>
                    onChangeParameters({
                      ...parameters,
                      heatPumpCop: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Required Cooling Capacity Highlight */}
              <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex flex-col gap-1">
                <div className="text-[10px] text-cyan-300 font-medium uppercase tracking-wider">
                  Kälteleistung der Quelle (Q₀)
                </div>
                <div className="text-lg font-mono font-extrabold text-cyan-200">
                  {requiredCoolingKw.toFixed(2)} kW
                </div>
                <div className="text-[10px] text-cyan-400/80">
                  Wärme, die der Grabenkollektor dem Boden entziehen muss
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t.brineSpread}</span>
                  <span className="font-mono font-bold text-white">{parameters.brineTempSpreadK.toFixed(1)} K</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="4.5"
                  step="0.1"
                  value={parameters.brineTempSpreadK}
                  onChange={(e) =>
                    onChangeParameters({
                      ...parameters,
                      brineTempSpreadK: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Soil Conditions */}
        <div>
          <button
            onClick={() => toggleSection('soil')}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition font-medium text-slate-200"
          >
            <div className="flex items-center gap-2">
              <Shovel className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bodenbeschaffenheit (VDI 4640)</span>
            </div>
            {openSections.soil ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.soil && (
            <div className="p-4 space-y-2 pt-1">
              {(Object.keys(SOIL_SPECS) as SoilType[]).map((soilKey) => {
                const spec = SOIL_SPECS[soilKey];
                const isSelected = parameters.defaultSoil === soilKey;

                return (
                  <button
                    key={soilKey}
                    onClick={() =>
                      onChangeParameters({
                        ...parameters,
                        defaultSoil: soilKey,
                      })
                    }
                    className={`w-full text-left p-2.5 rounded-lg border transition flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-slate-800 border-sky-500 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: spec.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">
                        {lang === 'de' ? spec.nameDe : spec.nameEn}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {spec.specificExtractionWm} W/m Graben ({spec.specificExtractionWm2} W/m²)
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Pipe & Circuit Specifications */}
        <div>
          <button
            onClick={() => toggleSection('pipe')}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition font-medium text-slate-200"
          >
            <div className="flex items-center gap-2">
              <Pipette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rohr- & Kreisspezifikation</span>
            </div>
            {openSections.pipe ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.pipe && (
            <div className="p-4 space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Rohrdimension</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PE100RC_32', 'PE100RC_40'] as PipeType[]).map((pType) => (
                    <button
                      key={pType}
                      onClick={() =>
                        onChangeParameters({
                          ...parameters,
                          pipeType: pType,
                        })
                      }
                      className={`p-2 rounded-lg border text-xs font-semibold transition ${
                        parameters.pipeType === pType
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pType === 'PE100RC_32' ? '32 × 2.9 mm' : '40 × 3.7 mm'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.circuitsCount}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() =>
                        onChangeParameters({
                          ...parameters,
                          numberOfCircuits: num,
                        })
                      }
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                        parameters.numberOfCircuits === num
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num} {num === 1 ? 'Kreis' : 'Kreise'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.lengthPerCircuit}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[300, 400].map((len) => (
                    <button
                      key={len}
                      onClick={() =>
                        onChangeParameters({
                          ...parameters,
                          pipeLengthPerCircuitM: len,
                        })
                      }
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                        parameters.pipeLengthPerCircuitM === len
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {len} m Bund
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex justify-between items-center text-xs">
                <span>Gesamtes Rohrmaterial:</span>
                <span className="font-mono font-bold text-white">
                  {parameters.numberOfCircuits * parameters.pipeLengthPerCircuitM} m
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
