import { create } from 'zustand';

type CoverageState = {
  medicationNames: string[];
  latitude: number | null;
  longitude: number | null;
  setCoverageInput: (input: { medicationNames: string[]; latitude: number; longitude: number }) => void;
  clear: () => void;
};

export const useCoverage = create<CoverageState>((set) => ({
  medicationNames: [],
  latitude: null,
  longitude: null,
  setCoverageInput: (input) =>
    set({ medicationNames: input.medicationNames, latitude: input.latitude, longitude: input.longitude }),
  clear: () => set({ medicationNames: [], latitude: null, longitude: null }),
}));
