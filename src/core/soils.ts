import { SoilSpec, SoilType } from '../types';

export const SOIL_SPECS: Record<SoilType, SoilSpec> = {
  sand_dry: {
    id: 'sand_dry',
    nameDe: 'Trockener Sand',
    nameEn: 'Dry Sand',
    descriptionDe: 'Grobe Körnung, geringe Wasserspeicherung. Niedrige Entzugsleistung.',
    descriptionEn: 'Coarse grain, poor water retention. Low specific heat extraction.',
    specificExtractionWm2: 10.0,
    specificExtractionWm: 25.0, // at 1.2m trench width, standard depth
    thermalConductivity: 0.4,    // W/(m·K)
    heatCapacityVolumetric: 1.3, // MJ/(m³·K)
    color: '#eab308',            // golden sand
  },
  sand_loamy: {
    id: 'sand_loamy',
    nameDe: 'Lehmiger Sand / Feuchter Sand',
    nameEn: 'Loamy Sand / Moist Sand',
    descriptionDe: 'Mischboden mit sandigen und tonigen Anteilen, gute kapillare Nachfeuchtung.',
    descriptionEn: 'Mixed soil with sandy and silty components, moderate moisture retention.',
    specificExtractionWm2: 16.0,
    specificExtractionWm: 45.0,
    thermalConductivity: 1.4,
    heatCapacityVolumetric: 2.0,
    color: '#d97706',            // amber/brown
  },
  loam_moist: {
    id: 'loam_moist',
    nameDe: 'Feuchter Lehm / Lehmboden',
    nameEn: 'Moist Loam',
    descriptionDe: 'Ausgewogener Standard-Boden in Mitteleuropa. Hohe Wärmekapazität und guter Kontakt.',
    descriptionEn: 'Standard Central European soil. High thermal capacity and optimal pipe contact.',
    specificExtractionWm2: 22.0,
    specificExtractionWm: 65.0,
    thermalConductivity: 1.8,
    heatCapacityVolumetric: 2.4,
    color: '#854d0e',            // deep loam
  },
  clay_heavy: {
    id: 'clay_heavy',
    nameDe: 'Ton / schwerer bindiger Boden',
    nameEn: 'Heavy Clay Soil',
    descriptionDe: 'Sehr dichte Bodenstruktur mit hohem Porenwasseranteil. Hervorragende Wärmeübertragung.',
    descriptionEn: 'Dense coherent structure with high pore water. Outstanding heat transfer.',
    specificExtractionWm2: 26.0,
    specificExtractionWm: 78.0,
    thermalConductivity: 2.1,
    heatCapacityVolumetric: 2.7,
    color: '#713f12',            // clay dark
  },
  waterlogged: {
    id: 'waterlogged',
    nameDe: 'Wasserführender Boden / Grundwasser',
    nameEn: 'Waterlogged Soil / High Groundwater',
    descriptionDe: 'Ständige Feuchte oder anstehendes Grundwasser im Grabenbereich. Maximale Entzugsleistung.',
    descriptionEn: 'Constant moisture or high water table in the trench zone. Maximum thermal yield.',
    specificExtractionWm2: 35.0,
    specificExtractionWm: 105.0,
    thermalConductivity: 2.5,
    heatCapacityVolumetric: 3.0,
    color: '#0284c7',            // aqua blue
  },
};
