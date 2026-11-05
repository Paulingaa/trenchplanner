import { PIPE_SPECS } from './pipes';
import { PipeType } from '../types';

export interface HydraulicCalculationInput {
  pipeType: PipeType;
  numberOfCircuits: number;
  circuitLengthM: number;
  coolingCapacityKw: number; // Q0
  brineTempSpreadK: number;  // delta T, e.g. 3.0 K
  glycolPercentage: number;  // 20 to 30 %
  temperatureC: number;      // average brine temperature, e.g. 0 °C
}

export interface HydraulicCalculationResult {
  totalFlowM3h: number;
  totalFlowLmin: number;
  circuitFlowM3h: number;
  circuitFlowLmin: number;
  velocityMs: number;
  reynoldsNumber: number;
  flowRegime: 'laminar' | 'transitional' | 'turbulent';
  frictionFactor: number;
  pipePressureDropKPa: number;
  fittingsPressureDropKPa: number;
  totalPressureDropKPa: number;
  totalPressureDropMbar: number;
  pumpHeadMwc: number; // meter water column
  pumpPowerWatts: number;
  isAcceptable: boolean;
  densityKgM3: number;
  dynamicViscosityPaS: number;
  specificHeatJkgK: number;
}

/**
 * Calculates brine physical properties (Monopropylene Glycol water mixture)
 */
export function getBrineProperties(glycolVolPercent: number, tempC: number) {
  // Glycol fraction x (e.g. 0.25)
  const x = Math.max(0.15, Math.min(0.40, glycolVolPercent / 100));
  
  // Density kg/m3 (approx for MPG-water)
  // At 0°C, 25% MPG ~ 1028 kg/m3
  const density = 1000 + 115 * x - 0.25 * tempC;
  
  // Specific heat capacity J/(kg·K)
  // Pure water is 4182, MPG is lower, approx 3920 at 25%
  const specificHeat = 4182 - 1050 * x + 1.2 * tempC;
  
  // Dynamic viscosity Pa·s
  // Very sensitive to temperature. At 0°C, 25% MPG is approx 4.8 - 5.2 mPa·s
  // At -5°C it can rise to ~6.5 mPa·s
  const baseMu = 0.00175 * Math.exp(1.7 * x);
  const tempFactor = Math.exp(-0.038 * tempC);
  const dynamicViscosity = baseMu * tempFactor;
  
  return { density, specificHeat, dynamicViscosity };
}

/**
 * Calculates Darcy friction factor using Churchill/Swamee-Jain formula
 */
function calculateFrictionFactor(Re: number, roughnessM: number, innerDiameterM: number): number {
  if (Re <= 0) return 0.064;
  if (Re < 2300) {
    return 64 / Re;
  }
  
  // Swamee-Jain equation for turbulent flow
  const relRoughness = roughnessM / innerDiameterM;
  const term = (relRoughness / 3.7) + (5.74 / Math.pow(Re, 0.9));
  const f = 0.25 / Math.pow(Math.log10(term), 2);
  
  // In coiled/slinky pipe, secondary flow (Dean vortex) increases friction by ~12%
  return f * 1.12;
}

export function calculateHydraulics(input: HydraulicCalculationInput): HydraulicCalculationResult {
  const {
    pipeType,
    numberOfCircuits,
    circuitLengthM,
    coolingCapacityKw,
    brineTempSpreadK,
    glycolPercentage,
    temperatureC,
  } = input;

  const pipeSpec = PIPE_SPECS[pipeType];
  const { density, specificHeat, dynamicViscosity } = getBrineProperties(glycolPercentage, temperatureC);

  // Required cooling capacity in Watts
  const q0Watts = Math.max(100, coolingCapacityKw * 1000);
  const deltaT = Math.max(1.0, brineTempSpreadK);

  // Total volumetric flow rate V_dot = Q0 / (rho * cp * deltaT) in m3/s
  const totalFlowM3s = q0Watts / (density * specificHeat * deltaT);
  const totalFlowM3h = totalFlowM3s * 3600;
  const totalFlowLmin = totalFlowM3h * (1000 / 60);

  // Flow per circuit
  const circuits = Math.max(1, numberOfCircuits);
  const circuitFlowM3s = totalFlowM3s / circuits;
  const circuitFlowM3h = totalFlowM3h / circuits;
  const circuitFlowLmin = totalFlowLmin / circuits;

  // Flow velocity in pipe: v = V_dot / A
  const d_i = pipeSpec.innerDiameterM;
  const pipeCrossSectionArea = (Math.PI / 4) * Math.pow(d_i, 2);
  const velocityMs = circuitFlowM3s / pipeCrossSectionArea;

  // Reynolds number Re = (rho * v * d_i) / mu
  const kinematicViscosity = dynamicViscosity / density;
  const reynoldsNumber = (velocityMs * d_i) / kinematicViscosity;

  let flowRegime: 'laminar' | 'transitional' | 'turbulent' = 'turbulent';
  if (reynoldsNumber < 2300) {
    flowRegime = 'laminar';
  } else if (reynoldsNumber < 3500) {
    flowRegime = 'transitional';
  }

  // Darcy friction factor
  const roughnessM = pipeSpec.roughnessMm / 1000;
  const frictionFactor = calculateFrictionFactor(reynoldsNumber, roughnessM, d_i);

  // Pipe pressure drop: delta_p = lambda * (L / d_i) * (rho * v^2 / 2) [Pa]
  const dynPressure = 0.5 * density * Math.pow(velocityMs, 2);
  const pipePressureDropPa = frictionFactor * (circuitLengthM / d_i) * dynPressure;
  const pipePressureDropKPa = pipePressureDropPa / 1000;

  // Minor losses (distributor manifold, valves, bend transitions) ~ 15% + 2.5 kPa
  const fittingsPressureDropKPa = pipePressureDropKPa * 0.15 + 2.5;
  const totalPressureDropKPa = pipePressureDropKPa + fittingsPressureDropKPa;
  const totalPressureDropMbar = totalPressureDropKPa * 10;

  // Pump head in meter water column (mWS)
  const g = 9.81;
  const pumpHeadMwc = (totalPressureDropKPa * 1000) / (density * g);

  // Hydraulic pump power with modern ECM pump efficiency ~ 50%
  const pumpEfficiency = 0.50;
  const pumpPowerWatts = (totalFlowM3s * (totalPressureDropKPa * 1000)) / pumpEfficiency;

  // RGK rule of thumb: max acceptable pressure drop is 35-40 kPa for standard heat pump circulators
  const isAcceptable = totalPressureDropKPa <= 38.0;

  return {
    totalFlowM3h,
    totalFlowLmin,
    circuitFlowM3h,
    circuitFlowLmin,
    velocityMs,
    reynoldsNumber,
    flowRegime,
    frictionFactor,
    pipePressureDropKPa,
    fittingsPressureDropKPa,
    totalPressureDropKPa,
    totalPressureDropMbar,
    pumpHeadMwc,
    pumpPowerWatts,
    isAcceptable,
    densityKgM3: density,
    dynamicViscosityPaS: dynamicViscosity,
    specificHeatJkgK: specificHeat,
  };
}
