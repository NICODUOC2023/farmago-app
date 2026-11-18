import { create } from 'zustand';
import type { PharmacyCoverage, PharmacyCoverageMedication } from '@/services/pharmacies';

export type CoverageMapTarget = {
  pharmacy: PharmacyCoverage;
  medication: PharmacyCoverageMedication | null;
};

type CoverageState = {
  medicationNames: string[];
  latitude: number | null;
  longitude: number | null;
  mapTarget: CoverageMapTarget | null;
  setCoverageInput: (input: { medicationNames: string[]; latitude: number; longitude: number }) => void;
  setMapTarget: (target: CoverageMapTarget) => void;
  clearMapTarget: () => void;
  clear: () => void;
};

export const useCoverage = create<CoverageState>((set) => ({
  medicationNames: [],
  latitude: null,
  longitude: null,
  mapTarget: null,
  setCoverageInput: (input) =>
    set({ medicationNames: input.medicationNames, latitude: input.latitude, longitude: input.longitude }),
  setMapTarget: (target) => set({ mapTarget: target }),
  clearMapTarget: () => set({ mapTarget: null }),
  clear: () => set({ medicationNames: [], latitude: null, longitude: null, mapTarget: null }),
}));
