import { ClimatePreset } from '../types';

export const CLIMATE_PRESETS: ClimatePreset[] = [
  // Germany
  { plz: '10115', city: 'Berlin', country: 'DE', designOutdoorTempC: -12.0, annualMeanTempC: 9.8 },
  { plz: '20095', city: 'Hamburg', country: 'DE', designOutdoorTempC: -10.0, annualMeanTempC: 9.2 },
  { plz: '80331', city: 'München', country: 'DE', designOutdoorTempC: -14.5, annualMeanTempC: 8.5 },
  { plz: '50667', city: 'Köln', country: 'DE', designOutdoorTempC: -10.0, annualMeanTempC: 10.3 },
  { plz: '60311', city: 'Frankfurt am Main', country: 'DE', designOutdoorTempC: -11.5, annualMeanTempC: 10.5 },
  { plz: '70173', city: 'Stuttgart', country: 'DE', designOutdoorTempC: -12.0, annualMeanTempC: 9.9 },
  { plz: '04109', city: 'Leipzig', country: 'DE', designOutdoorTempC: -13.0, annualMeanTempC: 9.4 },
  { plz: '90403', city: 'Nürnberg', country: 'DE', designOutdoorTempC: -13.5, annualMeanTempC: 9.0 },
  { plz: '82467', city: 'Garmisch-Partenkirchen', country: 'DE', designOutdoorTempC: -17.5, annualMeanTempC: 6.8 },
  { plz: '79098', city: 'Freiburg im Breisgau', country: 'DE', designOutdoorTempC: -10.5, annualMeanTempC: 11.0 },
  { plz: '94032', city: 'Passau', country: 'DE', designOutdoorTempC: -14.0, annualMeanTempC: 8.9 },
  { plz: '28195', city: 'Bremen', country: 'DE', designOutdoorTempC: -10.0, annualMeanTempC: 9.5 },
  { plz: '30159', city: 'Hannover', country: 'DE', designOutdoorTempC: -11.0, annualMeanTempC: 9.6 },
  { plz: '01067', city: 'Dresden', country: 'DE', designOutdoorTempC: -13.0, annualMeanTempC: 9.3 },
  { plz: '99084', city: 'Erfurt', country: 'DE', designOutdoorTempC: -14.0, annualMeanTempC: 8.4 },
  { plz: '87435', city: 'Kempten (Allgäu)', country: 'DE', designOutdoorTempC: -16.0, annualMeanTempC: 7.2 },
  { plz: '92637', city: 'Weiden in der Oberpfalz', country: 'DE', designOutdoorTempC: -15.5, annualMeanTempC: 7.8 },

  // Austria
  { plz: '1010', city: 'Wien', country: 'AT', designOutdoorTempC: -12.0, annualMeanTempC: 10.4 },
  { plz: '5020', city: 'Salzburg', country: 'AT', designOutdoorTempC: -14.0, annualMeanTempC: 8.9 },
  { plz: '6020', city: 'Innsbruck', country: 'AT', designOutdoorTempC: -13.5, annualMeanTempC: 8.7 },
  { plz: '8010', city: 'Graz', country: 'AT', designOutdoorTempC: -12.5, annualMeanTempC: 9.8 },
  { plz: '9020', city: 'Klagenfurt', country: 'AT', designOutdoorTempC: -15.0, annualMeanTempC: 8.5 },
  { plz: '4020', city: 'Linz', country: 'AT', designOutdoorTempC: -13.0, annualMeanTempC: 9.5 },

  // Switzerland
  { plz: '8001', city: 'Zürich', country: 'CH', designOutdoorTempC: -10.5, annualMeanTempC: 9.3 },
  { plz: '3011', city: 'Bern', country: 'CH', designOutdoorTempC: -11.0, annualMeanTempC: 8.8 },
  { plz: '4001', city: 'Basel', country: 'CH', designOutdoorTempC: -10.0, annualMeanTempC: 10.5 },
  { plz: '6003', city: 'Luzern', country: 'CH', designOutdoorTempC: -10.5, annualMeanTempC: 9.1 },
];

export function findClimateByPlzOrCity(query: string): ClimatePreset | undefined {
  const clean = query.trim().toLowerCase();
  if (!clean) return undefined;
  return CLIMATE_PRESETS.find(
    p => p.plz.toLowerCase() === clean || p.city.toLowerCase().includes(clean)
  );
}
