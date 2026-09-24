import { create } from 'zustand';

import { tratamientos, TratamientoGroup } from '@/data/mock';
import { AnalyzedMedicine } from '@/services/gemini';
import { dosesPerDay } from '@/utils/tratamiento';

type ScanResult = {
  medicamentos: AnalyzedMedicine[];
  notas: string;
  medico: string | null;
  institucion: string | null;
};

type TreatmentState = {
  groups: TratamientoGroup[];
  addFromScan: (receta: ScanResult) => void;
  toggleTaken: (itemId: string, slot: number) => void;
};

export const useTreatments = create<TreatmentState>((set) => ({
  groups: tratamientos,
  addFromScan: (receta) =>
    set((state) => ({
      groups: [
        {
          id: `scan-${Date.now()}`,
          title: `Escaneo ${state.groups.length + 1}`,
          source: 'escaneado',
          medico: receta.medico,
          institucion: receta.institucion,
          notas: receta.notas,
          items: receta.medicamentos.map((med, i) => ({
            id: `scan-${Date.now()}-${i}`,
            pharmacy: 'Receta escaneada',
            medicine: med.nombre,
            dose: med.dosis,
            frequency: med.frecuencia,
            duration: med.duracion,
            taken: Array.from({ length: dosesPerDay(med.frecuencia) }, () => false),
          })),
        },
        ...state.groups,
      ],
    })),
  toggleTaken: (itemId, slot) =>
    set((state) => ({
      groups: state.groups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                taken: item.taken.map((value, index) => (index === slot ? !value : value)),
              }
            : item,
        ),
      })),
    })),
}));