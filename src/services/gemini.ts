import { isSupabaseConfigured, getSupabase } from '@/lib/supabase';

export type AnalyzedMedicine = {
  nombre: string;
  principio_activo: string;
  concentracion: string;
  presentacion: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad: string;
  codigo_barras: string;
};

export type AnalyzedPrescription = {
  tipo: 'receta' | 'caja' | 'desconocido';
  medicamentos: AnalyzedMedicine[];
  codigo_barras: string;
  notas: string;
  medico: string | null;
  institucion: string | null;
  isDemo: boolean;
};

function normalizeMedicine(m: unknown): AnalyzedMedicine {
  const obj = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
  return {
    nombre: typeof obj.nombre === 'string' ? obj.nombre : '',
    principio_activo: typeof obj.principio_activo === 'string' ? obj.principio_activo : '',
    concentracion: typeof obj.concentracion === 'string' ? obj.concentracion : '',
    presentacion: typeof obj.presentacion === 'string' ? obj.presentacion : '',
    dosis: typeof obj.dosis === 'string' ? obj.dosis : '',
    frecuencia: typeof obj.frecuencia === 'string' ? obj.frecuencia : '',
    duracion: typeof obj.duracion === 'string' ? obj.duracion : '',
    cantidad: typeof obj.cantidad === 'string' ? obj.cantidad : '',
    codigo_barras: typeof obj.codigo_barras === 'string' ? obj.codigo_barras : '',
  };
}

function parseResult(raw: unknown): Omit<AnalyzedPrescription, 'isDemo'> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const medicamentos = Array.isArray(obj.medicamentos)
    ? obj.medicamentos.map(normalizeMedicine)
    : [];
  const tipo = obj.tipo === 'receta' || obj.tipo === 'caja' ? obj.tipo : 'desconocido';
  return {
    tipo,
    medicamentos,
    codigo_barras: typeof obj.codigo_barras === 'string' ? obj.codigo_barras : '',
    notas: typeof obj.notas === 'string' ? obj.notas : '',
    medico: typeof obj.medico === 'string' ? obj.medico : null,
    institucion: typeof obj.institucion === 'string' ? obj.institucion : null,
  };
}

function mockResult(): AnalyzedPrescription {
  return {
    tipo: 'receta',
    medicamentos: [
      {
        nombre: 'Paracetamol 500mg',
        principio_activo: 'Paracetamol',
        concentracion: '500 mg',
        presentacion: 'Comprimidos',
        dosis: '1 comprimido',
        frecuencia: 'cada 8 horas',
        duracion: '5 días',
        cantidad: '1 caja',
        codigo_barras: '',
      },
      {
        nombre: 'Enalapril 5mg',
        principio_activo: 'Enalapril',
        concentracion: '5 mg',
        presentacion: 'Comprimidos',
        dosis: '1 comprimido',
        frecuencia: 'cada 24 horas',
        duracion: '30 días',
        cantidad: '1 caja',
        codigo_barras: '',
      },
    ],
    codigo_barras: '',
    notas: 'Tomar después de las comidas. No suspender sin indicación médica.',
    medico: 'Dra. Valeria Rojas',
    institucion: 'Clínica Andes',
    isDemo: true,
  };
}

// La clave de Gemini NO se expone en el cliente. El OCR se realiza en la
// Edge Function `ocr-prescription`, que usa GEMINI_API_KEY como secret.
export async function analyzePrescriptionImage(input: {
  base64: string;
  mimeType: string;
}): Promise<AnalyzedPrescription> {
  if (!isSupabaseConfigured) {
    return mockResult();
  }

  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Iniciá sesión para escanear recetas.');
  }

  const { data, error } = await supabase.functions.invoke('ocr-prescription', {
    body: { imageBase64: input.base64, mimeType: input.mimeType },
  });

  if (error) {
    throw new Error(error.message || 'No se pudo analizar la receta.');
  }

  const payload = (data ?? {}) as { result?: unknown; isDemo?: boolean };
  return { ...parseResult(payload.result), isDemo: payload.isDemo === true };
}
