import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { dosesPerDay } from '@/utils/tratamiento';
import type { TratamientoGroup, TratamientoItem } from '@/data/mock';
import type { AnalyzedMedicine } from '@/services/gemini';

export type TreatmentMedicationInput = {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  cantidad: string;
};

export type CreateTreatmentInput = {
  medicamentos: AnalyzedMedicine[];
  notas: string;
  medico: string | null;
  institucion: string | null;
};

async function hasConsent(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const supabase = getSupabase();
  const { data, error } = await (supabase as any).rpc('has_active_consent', { p_type: 'health_data_processing' });
  if (error) return false;
  return data === true;
}

async function findMedicationId(name: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabase();
  const { data } = await supabase.from('medications').select('id').ilike('name', name.trim()).limit(1);
  return data && data.length ? (data[0].id as string) : null;
}

export async function createTreatment(input: CreateTreatmentInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Iniciá sesión para guardar tratamientos.');

  const consent = await hasConsent();
  if (!consent) throw new Error('Se requiere consentimiento para datos de salud.');

  const { data: treatment, error: tErr } = await supabase
    .from('treatments')
    .insert({
      user_id: session.user.id,
      source: 'manual',
      title: `Tratamiento ${new Date().toLocaleDateString('es-CL')}`,
      doctor_name: input.medico,
      institution: input.institucion,
      notes: input.notas,
      status: 'active',
    })
    .select('id')
    .single();

  if (tErr || !treatment) throw new Error(tErr?.message || 'No se pudo crear el tratamiento.');

  const treatmentId = treatment.id as string;

  for (const med of input.medicamentos) {
    const medicationId = await findMedicationId(med.nombre);
    const { error: mErr } = await supabase.from('treatment_medications').insert({
      treatment_id: treatmentId,
      medication_id: medicationId,
      custom_name: medicationId ? null : med.nombre,
      dose: med.dosis || null,
      frequency: med.frecuencia || null,
      doses_per_day: dosesPerDay(med.frecuencia),
      duration_days: null,
      is_active: true,
    });
    if (mErr) throw new Error(mErr.message);
  }

  return treatmentId;
}

export async function loadTreatments(): Promise<TratamientoGroup[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('treatments')
    .select('*, treatment_medications(*, medications(name))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((t: Record<string, unknown>) => {
    const meds = (t.treatment_medications as Record<string, unknown>[] | null) ?? [];
    const items: TratamientoItem[] = meds.map((tm) => {
      const med = (tm.medications as Record<string, unknown> | null) ?? {};
      const medName = (med.name as string) || (tm.custom_name as string) || 'Medicamento';
      const doses = (tm.doses_per_day as number) ?? 1;
      return {
        id: tm.id as string,
        pharmacy: '',
        medicine: medName,
        dose: (tm.dose as string) ?? '',
        frequency: (tm.frequency as string) ?? '',
        duration: tm.duration_days ? `${tm.duration_days} días` : '',
        taken: Array.from({ length: doses }, () => false),
      };
    });
    return {
      id: t.id as string,
      title: (t.title as string) ?? 'Tratamiento',
      source: t.source === 'prescription' ? 'escaneado' : 'manual',
      medico: (t.doctor_name as string) ?? null,
      institucion: (t.institution as string) ?? null,
      notas: (t.notes as string) ?? '',
      items,
    };
  });
}

export async function deleteTreatment(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const { error } = await supabase.from('treatments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listTreatments(): Promise<unknown[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('treatments').select('*, treatment_medications(*)');
  if (error) throw new Error(error.message);
  return data ?? [];
}
