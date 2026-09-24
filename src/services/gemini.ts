export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';

export type AnalyzedMedicine = {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
};

export type AnalyzedPrescription = {
  medicamentos: AnalyzedMedicine[];
  notas: string;
  medico: string | null;
  institucion: string | null;
  isDemo: boolean;
};

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GenerateContentResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

const PROMPT = `Analiza esta foto de una receta o indicación médica.

Devuelve SOLO JSON con esta forma (sin markdown):
{
  "medicamentos": [
    { "nombre": "nombre del medicamento", "dosis": "cantidad/horario", "frecuencia": "cada cuánto se toma", "duracion": "por cuánto tiempo" }
  ],
  "notas": "otras instrucciones del médico",
  "medico": "nombre del médico o null si no aparece",
  "institucion": "clínica/hospital o null si no aparece"
}

Reglas:
- "medicamentos" siempre es un arreglo; si no hay ninguno, arreglo vacío.
- Cuando un campo no aparezca en la imagen usa string vacío o null según el tipo.
- Escribe todo en español, manteniendo el nombre comercial exacto del medicamento.`;

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseResult(raw: string): Omit<AnalyzedPrescription, 'isDemo'> {
  const parsed = JSON.parse(stripFences(raw)) as Partial<AnalyzedPrescription>;
  const medicamentos = Array.isArray(parsed.medicamentos)
    ? parsed.medicamentos.map((m) => ({
        nombre: typeof m.nombre === 'string' ? m.nombre : '',
        dosis: typeof m.dosis === 'string' ? m.dosis : '',
        frecuencia: typeof m.frecuencia === 'string' ? m.frecuencia : '',
        duracion: typeof m.duracion === 'string' ? m.duracion : '',
      }))
    : [];
  return {
    medicamentos,
    notas: typeof parsed.notas === 'string' ? parsed.notas : '',
    medico: typeof parsed.medico === 'string' ? parsed.medico : null,
    institucion: typeof parsed.institucion === 'string' ? parsed.institucion : null,
  };
}

function mockResult(): AnalyzedPrescription {
  return {
    medicamentos: [
      { nombre: 'Paracetamol 500mg', dosis: '1 comprimido', frecuencia: 'cada 8 horas', duracion: '5 días' },
      { nombre: 'Enalapril 5mg', dosis: '1 comprimido', frecuencia: 'cada 24 horas', duracion: '30 días' },
    ],
    notas: 'Tomar después de las comidas. No suspender sin indicación médica.',
    medico: 'Dra. Valeria Rojas',
    institucion: 'Clínica Andes',
    isDemo: true,
  };
}

export function hasGeminiKey(): boolean {
  return Boolean(GEMINI_API_KEY);
}

// Sin API key devuelve una receta mock para seguir validando el flujo completo.
export async function analyzePrescriptionImage(input: {
  base64: string;
  mimeType: string;
}): Promise<AnalyzedPrescription> {
  if (!GEMINI_API_KEY) {
    return mockResult();
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const body: { contents: { parts: GeminiPart[] }[]; generationConfig: Record<string, unknown> | undefined } = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: input.mimeType, data: input.base64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini respondió ${response.status}: ${detail}`);
  }

  const json = (await response.json()) as GenerateContentResponse;
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) {
    throw new Error('Gemini no devolvió texto en la respuesta.');
  }

  return { ...parseResult(text), isDemo: false };
}