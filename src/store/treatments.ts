import { create } from 'zustand';
import { isSupabaseConfigured } from '@/lib/supabase';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { tratamientos, TratamientoGroup } from '@/data/mock';
import { AnalyzedMedicine } from '@/services/gemini';
import { dosesPerDay } from '@/utils/tratamiento';
import { createTreatment, deleteTreatment, loadTreatments } from '@/services/treatments';
import { scheduleTreatmentReminders, cancelTreatmentReminders } from '@/services/reminders';

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
  removeGroup: (groupId: string) => void;
  loadFromSupabase: () => Promise<void>;
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useTreatments = create<TreatmentState>()(
  persist(
    (set) => ({
      groups: isSupabaseConfigured ? [] : tratamientos,
      addFromScan: (receta) => {
        void (async () => {
          try {
            const id = await createTreatment({
              medicamentos: receta.medicamentos,
              notas: receta.notas,
              medico: receta.medico,
              institucion: receta.institucion,
            });
            if (id) {
              const items = receta.medicamentos.map((med, i) => ({
                id: `${id}-${i}`,
                pharmacy: 'Receta escaneada',
                medicine: med.nombre,
                dose: med.dosis,
                frequency: med.frecuencia,
                duration: med.duracion,
                taken: Array.from({ length: dosesPerDay(med.frecuencia) }, () => false),
              }));
              await scheduleTreatmentReminders(id, items);
            }
          } catch {
            // Persistencia provisional.
          }
        })();
        set((state) => {
          const groupId = `scan-${newId()}`;
          return {
            groups: [
              {
                id: groupId,
                title: `Escaneo ${state.groups.length + 1}`,
                source: 'escaneado',
                medico: receta.medico,
                institucion: receta.institucion,
                notas: receta.notas,
                items: receta.medicamentos.map((med, i) => ({
                  id: `${groupId}-${i}`,
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
          };
        });
      },
      loadFromSupabase: async () => {
        try {
          const groups = await loadTreatments();
          if (groups.length > 0) {
            set({ groups });
          }
        } catch {
          // Mantener datos actuales si falla.
        }
      },

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
      removeGroup: (groupId) => {
        void (async () => {
          try { await cancelTreatmentReminders(groupId); } catch {}
          try { await deleteTreatment(groupId); } catch {}
        })();
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== groupId),
        }));
      },
    }),
    {
      name: 'farmago-treatments',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
