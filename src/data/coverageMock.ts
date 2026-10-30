import type { PharmacyCoverage, PharmacyCoverageMedication } from '@/services/pharmacies';

export type CoverageResult = {
  full: PharmacyCoverage | null;
  partial: { medication: string; pharmacies: PharmacyCoverage[] }[];
};

function makeMed(name: string, price: number): PharmacyCoverageMedication {
  return {
    medication_id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    price,
    quantity: 10,
    last_synced_at: new Date().toISOString(),
  };
}

export function mockCoverage(medicationNames: string[]): CoverageResult {
  const meds = medicationNames.length ? medicationNames : ['Paracetamol 500 mg'];
  const now = new Date().toISOString();

  const fullPharmacy: PharmacyCoverage = {
    pharmacy_id: 'farmex-guardia-vieja-80',
    pharmacy_name: 'Farmex',
    address: 'Guardia Vieja 80, Providencia, Santiago',
    latitude: -33.42333,
    longitude: -70.610585,
    matched_count: meds.length,
    required_count: meds.length,
    coverage_percent: 100,
    distance_m: 1200,
    total_price: meds.reduce((acc, _, i) => acc + 4990 + i * 1000, 0),
    last_synced_at: now,
    matched_medications: meds.map((m, i) => makeMed(m, 4990 + i * 1000)),
  };

  // Simulate full coverage for <= 3 meds; otherwise partial.
  const full = meds.length <= 3 ? fullPharmacy : null;

  const partial = meds.map((med, i) => ({
    medication: med,
    pharmacies: [
      {
        pharmacy_id: `farm-${i}-1`,
        pharmacy_name: 'Farmacia Providencia',
        address: 'Av. Providencia 1234',
        latitude: -33.4315,
        longitude: -70.6093,
        matched_count: 1,
        required_count: 1,
        coverage_percent: 100,
        distance_m: 800 + i * 200,
        total_price: 4990 + i * 500,
        last_synced_at: now,
        matched_medications: [makeMed(med, 4990 + i * 500)],
      },
      {
        pharmacy_id: `farm-${i}-2`,
        pharmacy_name: 'Farmacia Ñuñoa',
        address: 'Av. Irarrázaval 3210',
        latitude: -33.4569,
        longitude: -70.5976,
        matched_count: 1,
        required_count: 1,
        coverage_percent: 100,
        distance_m: 2500 + i * 300,
        total_price: 5200 + i * 500,
        last_synced_at: now,
        matched_medications: [makeMed(med, 5200 + i * 500)],
      },
    ].slice(0, 5),
  }));

  return { full, partial };
}
