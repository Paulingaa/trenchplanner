// Core Domain Types for Ringgrabenkollektor (RGK) Planning Tool

export type Language = 'de' | 'en';
export type Theme = 'dark' | 'light';

export type PipeType = 'PE100RC_32' | 'PE100RC_40';

export interface PipeSpec {
  id: PipeType;
  name: string;
  nominalOuterDiameterMm: number;
  wallThicknessMm: number;
  innerDiameterMm: number;
  innerDiameterM: number;
  standardCoilLengths: number[]; // e.g. [300, 400]
  roughnessMm: number; // typically 0.007 mm for PE
  maxOperatingBar: number;
  volumePerMeterLiters: number;
}

export type SoilType =
  | 'sand_dry'
  | 'sand_loamy'
  | 'loam_moist'
  | 'clay_heavy'
  | 'waterlogged';

export interface SoilSpec {
  id: SoilType;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  specificExtractionWm2: number; // W/m² surface extraction
  specificExtractionWm: number;  // Base W/m for typical 1.2m wide trench
  thermalConductivity: number;   // W/(m·K)
  heatCapacityVolumetric: number;// MJ/(m³·K)
  color: string;
}

export type SegmentType =
  | 'slinky'         // Overlapping loops
  | 'straight'       // Straight pipe
  | 'connection_cold'// Uninsulated cold supply connection
  | 'connection_warm'// Uninsulated warm return connection
  | 'connection_insulated'; // Insulated connection near house foundation

export interface Point2D {
  x: number; // in meters relative to canvas origin
  y: number; // in meters relative to canvas origin
}

export interface TrenchSegment {
  id: string;
  name: string;
  startPoint: Point2D;
  endPoint: Point2D;
  lengthM: number; // calculated from points or overridden
  widthM: number;  // e.g. 1.2 m
  depthM: number;  // e.g. 1.6 m (depth of trench bed)
  type: SegmentType;
  allocatedPipeLengthM: number; // pipe meters assigned to this segment
  loopDiameterM?: number;       // diameter of slinky loops (default = widthM - 0.1)
  numberOfCircuits: number;     // e.g. 1, 2, or 3 parallel pipes
  soilOverride?: SoilType;      // optional per-segment soil condition
  notes?: string;
}

export interface BuildingElement {
  id: string;
  name: string;
  x: number; // top-left x in meters
  y: number; // top-left y in meters
  width: number; // in meters
  height: number; // in meters
  rotationDeg: number;
  type: 'house' | 'garage' | 'carport' | 'terrace' | 'restricted_zone' | 'tree' | 'cistern' | 'utility_line';
  radius?: number; // for circular obstacles like trees or round cisterns
}

export interface PropertyBoundary {
  points: Point2D[]; // Polygon vertices in meters
  setbackM: number;   // Grenzabstand, e.g. 1.0 m or 2.0 m
}

export interface DistributorLocation {
  x: number;
  y: number;
  name: string;
  type: 'manifold'; // Hausanschlussraum / Soleverteiler
}

export interface ClimatePreset {
  plz: string;
  city: string;
  country: 'DE' | 'AT' | 'CH';
  designOutdoorTempC: number; // Norm-Außentemperatur (°C)
  annualMeanTempC: number;
}

export interface ProjectParameters {
  projectName: string;
  author: string;
  date: string;
  // Climate & Building
  postalCode: string;
  city: string;
  designOutdoorTempC: number; // -10 to -18 °C
  buildingHeatingLoadKw: number; // 3.0 to 20.0 kW
  numberOfResidents: number;
  domesticHotWaterPerPersonKw: number; // 0.20 kW default
  includeDhw: boolean;
  
  // Heat Pump & Hydraulics
  heatPumpCop: number; // Seasonal Performance Factor (JAZ), e.g. 4.8
  brineTempSpreadK: number; // ΔT, e.g. 3.0 K
  brineGlycolPercent: number; // 20% to 25% Monopropylene or Ethylene glycol
  minAverageBrineTempC: number; // -1.5 °C standard design minimum limit
  
  // Soil & Ground
  defaultSoil: SoilType;
  groundwaterDepthM?: number; // depth to ground water
  
  // Pipe Configuration
  pipeType: PipeType;
  numberOfCircuits: number; // 1, 2, or 3
  pipeLengthPerCircuitM: number; // typically 300 m or 400 m
}

export interface SimulationResults {
  // Heating & Extraction Demands
  totalHeatingLoadKw: number;       // Qh + Q_dhw
  dhwLoadKw: number;
  requiredCoolingCapacityKw: number; // Q0 = Qh * (1 - 1/COP)
  annualHeatDemandKwh: number;      // based on 2000 full-load hours
  annualGroundExtractionKwh: number;
  
  // Collector Yield
  totalTrenchLengthM: number;
  totalPipeInstalledM: number;
  totalPipeAvailableM: number;
  totalTrenchExtractionKw: number;  // simulated ground thermal yield
  coverageRatioPercent: number;     // totalTrenchExtraction / requiredCoolingCapacity * 100
  isSufficient: boolean;
  
  // Hydraulics per Circuit
  totalBrineFlowRateM3h: number;    // V_dot total
  circuitBrineFlowRateLmin: number; // per single pipe
  flowVelocityMs: number;           // v in m/s
  reynoldsNumber: number;           // Re
  flowRegime: 'laminar' | 'transitional' | 'turbulent';
  pipePressureDropKPa: number;      // pressure loss in kPa
  manifoldPressureDropKPa: number;  // manifold & fitting loss
  totalPressureDropKPa: number;
  totalPressureDropMbar: number;
  pumpHeadMwc: number;              // meter water column (mWS)
  hydraulicPumpPowerWatts: number;
  isPressureDropAcceptable: boolean;// < 35-40 kPa
  
  // Segment details
  segmentResults: {
    segmentId: string;
    extractionKw: number;
    specificWm: number;
    loopCount: number;
    loopSpacingCm: number;
    effectiveSoil: SoilType;
  }[];
  
  // Warnings / Notes
  warnings: string[];
  recommendations: string[];
}

export interface RgkProjectState {
  version: string;
  parameters: ProjectParameters;
  property: PropertyBoundary;
  distributor: DistributorLocation;
  obstacles: BuildingElement[];
  segments: TrenchSegment[];
}
