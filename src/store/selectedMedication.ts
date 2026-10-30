import { create } from 'zustand';
import type { MedicationResult } from '@/services/medications';

type State = {
  medication: MedicationResult | null;
  setMedication: (m: MedicationResult | null) => void;
  clear: () => void;
};

export const useSelectedMedication = create<State>((set) => ({
  medication: null,
  setMedication: (m) => set({ medication: m }),
  clear: () => set({ medication: null }),
}));
