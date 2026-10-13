import { SupabaseNotConfiguredError, getSupabase } from '@/lib/supabase';

/**
 * Busqueda de medicamentos por nombre, codigo de barras o descripcion.
 *
 * Requiere sesion autenticada (RLS aplica sobre medications). No consulta
 * pharmacy_stock, disponibilidad ni precios: solo datos del catalogo.
 */

export type MedicationResult = {
  id: string;
  name: string;
  barcode: string | null;
  description: string | null;
  presentation_unit: string | null;
};

export type MedicationSearchErrorCode =
  | 'not_authenticated'
  | 'not_configured'
  | 'request_failed';

export class MedicationSearchError extends Error {
  readonly code: MedicationSearchErrorCode;

  constructor(code: MedicationSearchErrorCode, message: string) {
    super(message);
    this.name = 'MedicationSearchError';
    this.code = code;
  }
}

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 20;
const FETCH_LIMIT = 40;

/**
 * Escapa caracteres especiales de filtros PostgREST en el termino de busqueda
 * del usuario. Sin esto, caracteres como `,`, `(`, `*`, `%`, `_`, `&`, `|`, etc.
 * romperian la consulta o introducirian comportamientos no deseados.
 *
 * PostgREST interpreta `\` como escape dentro de un valor de filtro.
 */
function escapePostgrestValue(value: string): string {
  return value.replace(/[(),.:;*|&"'\\%_~=<>\s]/g, (ch) => `\\${ch}`);
}

function buildSearchFilter(escaped: string): string {
  const contains = `*${escaped}*`;
  const prefix = `${escaped}*`;
  return [
    `name.ilike.${prefix}`,
    `name.ilike.${contains}`,
    `barcode.ilike.${contains}`,
    `description.ilike.${contains}`,
  ].join(',');
}

function prioritizeByNameStart(results: MedicationResult[], query: string): MedicationResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return results;

  return [...results].sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q);
    const bStarts = b.name.toLowerCase().startsWith(q);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function searchMedications(query: string): Promise<MedicationResult[]> {
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      throw new MedicationSearchError('not_configured', error.message);
    }
    throw error;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new MedicationSearchError(
      'not_authenticated',
      'Iniciá sesión para buscar medicamentos.',
    );
  }

  const escaped = escapePostgrestValue(trimmed);
  const filter = buildSearchFilter(escaped);

  const { data, error } = await supabase
    .from('medications')
    .select('id, name, barcode, description, presentation_unit')
    .or(filter)
    .order('name')
    .limit(FETCH_LIMIT);

  if (error) {
    throw new MedicationSearchError('request_failed', error.message);
  }

  const results: MedicationResult[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    barcode: row.barcode ?? null,
    description: row.description ?? null,
    presentation_unit: row.presentation_unit ?? null,
  }));

  return prioritizeByNameStart(results, trimmed).slice(0, RESULT_LIMIT);
}
