import { PipeSpec, PipeType } from '../types';

export const PIPE_SPECS: Record<PipeType, PipeSpec> = {
  PE100RC_32: {
    id: 'PE100RC_32',
    name: 'PE 100-RC 32 x 2.9 mm (SDR 11)',
    nominalOuterDiameterMm: 32,
    wallThicknessMm: 2.9,
    innerDiameterMm: 26.2,
    innerDiameterM: 0.0262,
    standardCoilLengths: [300, 400],
    roughnessMm: 0.007,
    maxOperatingBar: 16,
    volumePerMeterLiters: Math.PI * Math.pow(0.0262 / 2, 2) * 1000, // ~0.539 L/m
  },
  PE100RC_40: {
    id: 'PE100RC_40',
    name: 'PE 100-RC 40 x 3.7 mm (SDR 11)',
    nominalOuterDiameterMm: 40,
    wallThicknessMm: 3.7,
    innerDiameterMm: 32.6,
    innerDiameterM: 0.0326,
    standardCoilLengths: [300, 400],
    roughnessMm: 0.007,
    maxOperatingBar: 16,
    volumePerMeterLiters: Math.PI * Math.pow(0.0326 / 2, 2) * 1000, // ~0.835 L/m
  },
};
