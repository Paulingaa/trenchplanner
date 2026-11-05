import {
  ProjectParameters,
  RgkProjectState,
  SimulationResults,
  TrenchSegment,
  SoilType,
} from '../types';
import { SOIL_SPECS } from './soils';
import { calculateHydraulics } from './hydraulics';

export function runRgkSimulation(state: RgkProjectState): SimulationResults {
  const { parameters, segments } = state;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Heating Demand & Heat Pump extraction
  const dhwLoadKw = parameters.includeDhw
    ? parameters.numberOfResidents * parameters.domesticHotWaterPerPersonKw
    : 0;
  const totalHeatingLoadKw = parameters.buildingHeatingLoadKw + dhwLoadKw;

  // Heat pump extraction demand Q0 = Qh * (1 - 1/COP)
  const cop = Math.max(1.1, parameters.heatPumpCop);
  const requiredCoolingCapacityKw = totalHeatingLoadKw * (1 - 1 / cop);

  // Full-load hours ~ 2000 h/a
  const fullLoadHours = 2000;
  const annualHeatDemandKwh = totalHeatingLoadKw * fullLoadHours;
  const annualGroundExtractionKwh = requiredCoolingCapacityKw * fullLoadHours;

  // 2. Climate factor
  // Base design outdoor temp is -12°C. Lower design outdoor temp reduces ground temperature slightly.
  const climateFactor = 1 + (-12 - parameters.designOutdoorTempC) * 0.015;

  // 3. Segment calculations
  let totalTrenchLengthM = 0;
  let totalTrenchExtractionKw = 0;
  let totalAllocatedPipeM = 0;

  const segmentResults = segments.map((seg, index) => {
    // Determine segment length
    const dx = seg.endPoint.x - seg.startPoint.x;
    const dy = seg.endPoint.y - seg.startPoint.y;
    const geometricLength = Math.sqrt(dx * dx + dy * dy);
    const lengthM = seg.lengthM > 0 ? seg.lengthM : geometricLength;
    totalTrenchLengthM += lengthM;

    const soilType: SoilType = seg.soilOverride || parameters.defaultSoil;
    const soil = SOIL_SPECS[soilType];

    const widthM = Math.max(0.4, seg.widthM || 1.2);
    const depthM = Math.max(0.8, seg.depthM || 1.5);

    // Trench width correction factor (baseline 1.2m)
    const widthFactor = 0.70 + 0.30 * (widthM / 1.2);

    // Trench depth correction factor (baseline 1.5m; deeper soil is warmer in winter)
    const depthFactor = 1.0 + (depthM - 1.5) * 0.20;

    let segmentExtractionKw = 0;
    let specificWm = 0;
    let loopCount = 0;
    let loopSpacingCm = 0;

    const pipePerCircuit = seg.allocatedPipeLengthM || 0;
    totalAllocatedPipeM += pipePerCircuit;

    if (seg.type === 'connection_insulated') {
      // Insulated trench near house cellar: 0 extraction
      segmentExtractionKw = 0;
      specificWm = 0;
      loopCount = 0;
      loopSpacingCm = 0;
    } else if (seg.type === 'connection_cold' || seg.type === 'connection_warm' || seg.type === 'straight') {
      // Straight pipe along trench
      const baseStraightWm = Math.min(35, soil.specificExtractionWm * 0.45);
      specificWm = baseStraightWm * widthFactor * depthFactor * climateFactor;
      segmentExtractionKw = (specificWm * lengthM) / 1000;
      loopCount = 0;
      loopSpacingCm = 0;
    } else {
      // Slinky segment
      const loopDiameter = seg.loopDiameterM || Math.max(0.6, widthM - 0.1);
      const loopCircumference = Math.PI * loopDiameter;

      // Pipe density factor
      // Ratio of allocated pipe to trench length
      const ratio = lengthM > 0 ? pipePerCircuit / lengthM : 1;
      const densityFactor = Math.min(1.4, 0.7 + 0.12 * Math.log(Math.max(1, ratio)));

      // Cold vs Warm gradient bonus (first segments extract more efficiently because brine is colder)
      const relativePosition = segments.length > 1 ? index / (segments.length - 1) : 0.5;
      const thermalGradientFactor = 1.15 - 0.25 * relativePosition;

      specificWm = soil.specificExtractionWm * widthFactor * depthFactor * densityFactor * climateFactor * thermalGradientFactor;
      segmentExtractionKw = (specificWm * lengthM) / 1000;

      // Estimate number of loops and spacing
      if (pipePerCircuit > lengthM && loopCircumference > 0) {
        loopCount = Math.max(1, Math.round((pipePerCircuit - lengthM) / loopCircumference));
        loopSpacingCm = loopCount > 0 ? Math.round((lengthM / loopCount) * 100) : 0;
      }
    }

    totalTrenchExtractionKw += segmentExtractionKw;

    return {
      segmentId: seg.id,
      extractionKw: segmentExtractionKw,
      specificWm,
      loopCount,
      loopSpacingCm,
      effectiveSoil: soilType,
    };
  });

  // 4. Pipe Length Checks
  const totalAvailablePerCircuit = parameters.pipeLengthPerCircuitM;
  const totalPipeAvailableM = totalAvailablePerCircuit * parameters.numberOfCircuits;
  const totalPipeInstalledM = totalAllocatedPipeM * parameters.numberOfCircuits;

  if (Math.abs(totalAllocatedPipeM - totalAvailablePerCircuit) > 5) {
    if (totalAllocatedPipeM < totalAvailablePerCircuit) {
      warnings.push(
        `Nicht verlegtes Rohr: Noch ${(totalAvailablePerCircuit - totalAllocatedPipeM).toFixed(0)} m Rohr pro Kreis unzugeordnet.`
      );
    } else {
      warnings.push(
        `Rohrüberbelegung: ${(totalAllocatedPipeM - totalAvailablePerCircuit).toFixed(0)} m mehr Rohr zugeordnet als Kreis-Nennlänge (${totalAvailablePerCircuit} m)!`
      );
    }
  }

  // 5. Thermal Coverage Ratio
  const coverageRatioPercent = requiredCoolingCapacityKw > 0
    ? (totalTrenchExtractionKw / requiredCoolingCapacityKw) * 100
    : 100;
  const isSufficient = coverageRatioPercent >= 99.5;

  if (coverageRatioPercent < 100) {
    warnings.push(
      `Unterdimensioniert: Entzugsleistung deckt nur ${coverageRatioPercent.toFixed(1)}% der benötigten Kälteleistung (${requiredCoolingCapacityKw.toFixed(2)} kW).`
    );
  }

  // 6. Hydraulics
  const hydraulics = calculateHydraulics({
    pipeType: parameters.pipeType,
    numberOfCircuits: parameters.numberOfCircuits,
    circuitLengthM: totalAvailablePerCircuit,
    coolingCapacityKw: requiredCoolingCapacityKw,
    brineTempSpreadK: parameters.brineTempSpreadK,
    glycolPercentage: parameters.brineGlycolPercent,
    temperatureC: 0.0,
  });

  if (!hydraulics.isAcceptable) {
    warnings.push(
      `Hoher Druckverlust (${hydraulics.totalPressureDropKPa.toFixed(1)} kPa). Standard-Umwälzpumpen bevorzugen < 35-38 kPa. Ziehen Sie 40 mm Rohr oder mehr Kreise in Betracht.`
    );
  }

  if (hydraulics.flowRegime === 'laminar') {
    recommendations.push(
      'Strömung ist laminar (Re < 2300). Geringerer Wärmeübergangskoeffizient im Rohr. Durch Krümmung in den Slinkies wird jedoch eine vorteilhafte Sekundärströmung erzeugt.'
    );
  } else if (hydraulics.flowRegime === 'turbulent') {
    recommendations.push(
      `Turbulente Strömung (Re = ${hydraulics.reynoldsNumber.toFixed(0)}) gewährleistet optimalen Wärmeübergang an der Rohrwand.`
    );
  }

  if (coverageRatioPercent >= 105 && hydraulics.isAcceptable) {
    recommendations.push(
      'Optimal dimensioniert: Ausreichende thermische Sicherheitsreserve und hydraulisch ideal im grünen Bereich.'
    );
  }

  return {
    totalHeatingLoadKw,
    dhwLoadKw,
    requiredCoolingCapacityKw,
    annualHeatDemandKwh,
    annualGroundExtractionKwh,
    totalTrenchLengthM,
    totalPipeInstalledM,
    totalPipeAvailableM,
    totalTrenchExtractionKw,
    coverageRatioPercent,
    isSufficient,
    totalBrineFlowRateM3h: hydraulics.totalFlowM3h,
    circuitBrineFlowRateLmin: hydraulics.circuitFlowLmin,
    flowVelocityMs: hydraulics.velocityMs,
    reynoldsNumber: hydraulics.reynoldsNumber,
    flowRegime: hydraulics.flowRegime,
    pipePressureDropKPa: hydraulics.pipePressureDropKPa,
    manifoldPressureDropKPa: hydraulics.fittingsPressureDropKPa,
    totalPressureDropKPa: hydraulics.totalPressureDropKPa,
    totalPressureDropMbar: hydraulics.totalPressureDropMbar,
    pumpHeadMwc: hydraulics.pumpHeadMwc,
    hydraulicPumpPowerWatts: hydraulics.pumpPowerWatts,
    isPressureDropAcceptable: hydraulics.isAcceptable,
    segmentResults,
    warnings,
    recommendations,
  };
}
