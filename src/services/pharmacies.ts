import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { isStockFresh } from '@/constants/stock';

/**
 * Búsqueda de farmacias cercanas a través de la RPC `nearby_pharmacies`.
 *
 * La RPC exige una sesión autenticada (las políticas RLS aplican sobre las
 * tablas que consulta). No se persiste la ubicación del usuario: solo se envía
 * como parámetro de la consulta.
 */

type NearbyPharmaciesRow =
  Database['public']['Functions']['nearby_pharmacies']['Returns'][number];

export type NearbyPharmacy = {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  /** Distancia en metros calculada por PostGIS. */
  distanceM: number;
  isAvailable: boolean;
  price: number | null;
  quantity: number | null;
  lastSyncedAt: string | null;
  openingTime: string | null;
  closingTime: string | null;
  /**
   * La RPC `nearby_pharmacies` todavía NO devuelve el teléfono, por lo que
   * siempre llega `null`. Se deja tipado para no inventar el dato.
   */
  phone: string | null;
};

export type FindNearbyPharmaciesParams = {
  latitude: number;
  longitude: number;
  radiusM?: number;
  limit?: number;
  medicationId?: string;
};

export type PharmacySearchErrorCode = 'not_authenticated' | 'not_configured' | 'request_failed';

export class PharmacySearchError extends Error {
  readonly code: PharmacySearchErrorCode;

  constructor(code: PharmacySearchErrorCode, message: string) {
    super(message);
    this.name = 'PharmacySearchError';
    this.code = code;
  }
}

export const DEFAULT_RADIUS_M = 5_000;
export const DEFAULT_LIMIT = 20;

function normalize(row: NearbyPharmaciesRow): NearbyPharmacy {
  return {
    id: row.pharmacy_id,
    name: row.name,
    chain: row.chain ?? null,
    address: row.address ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceM: row.distance_m,
    isAvailable: row.is_available ?? false,
    price: row.price ?? null,
    quantity: row.quantity ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
    openingTime: row.opening_time ?? null,
    closingTime: row.closing_time ?? null,
    phone: null,
  };
}

function hasBetterStockSnapshot(candidate: NearbyPharmacy, current: NearbyPharmacy): boolean {
  const candidateFresh = isStockFresh(candidate.lastSyncedAt);
  const currentFresh = isStockFresh(current.lastSyncedAt);
  if (candidateFresh !== currentFresh) return candidateFresh;
  if (candidate.isAvailable !== current.isAvailable) return candidate.isAvailable;

  const candidateTimestamp = Date.parse(candidate.lastSyncedAt ?? '');
  const currentTimestamp = Date.parse(current.lastSyncedAt ?? '');
  const candidateHasTimestamp = Number.isFinite(candidateTimestamp);
  const currentHasTimestamp = Number.isFinite(currentTimestamp);
  if (candidateHasTimestamp !== currentHasTimestamp) return candidateHasTimestamp;
  return candidateHasTimestamp && candidateTimestamp > currentTimestamp;
}

function uniquePharmacies(rows: NearbyPharmacy[]): NearbyPharmacy[] {
  const byId = new Map<string, NearbyPharmacy>();
  for (const pharmacy of rows) {
    const current = byId.get(pharmacy.id);
    if (!current || hasBetterStockSnapshot(pharmacy, current)) {
      byId.set(pharmacy.id, pharmacy);
    }
  }
  return [...byId.values()];
}

export async function findNearbyPharmacies({
  latitude,
  longitude,
  radiusM = DEFAULT_RADIUS_M,
  limit = DEFAULT_LIMIT,
  medicationId,
}: FindNearbyPharmaciesParams): Promise<NearbyPharmacy[]> {
  const supabase = getSupabase();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new PharmacySearchError(
      'not_authenticated',
      'Iniciá sesión para buscar farmacias cercanas con stock.',
    );
  }

  const { data, error } = await supabase.rpc('nearby_pharmacies', {
    p_lat: latitude,
    p_lng: longitude,
    p_radius_m: radiusM,
    p_limit: limit,
    ...(medicationId ? { p_medication_id: medicationId } : {}),
  });

  if (error) {
    throw new PharmacySearchError('request_failed', error.message);
  }

  // Without a medication filter the RPC left-joins every stock row, so it can
  // return the same pharmacy more than once. Keep one marker/card per pharmacy.
  return uniquePharmacies((data ?? []).map(normalize));
}

export type PharmacyCoverageMedication = {
  medication_id: string;
  name: string;
  price: number | null;
  quantity: number | null;
  last_synced_at: string | null;
};

export type PharmacyCoverage = {
  pharmacy_id: string;
  pharmacy_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  matched_count: number;
  required_count: number;
  coverage_percent: number;
  distance_m: number;
  total_price: number | null;
  last_synced_at: string | null;
  matched_medications: PharmacyCoverageMedication[];
};

export type FindPharmacyCoverageParams = {
  medicationIds: string[];
  latitude: number;
  longitude: number;
  radiusM?: number;
};

export async function findPharmacyCoverage({
  medicationIds,
  latitude,
  longitude,
  radiusM = DEFAULT_RADIUS_M,
}: FindPharmacyCoverageParams): Promise<PharmacyCoverage[]> {
  const supabase = getSupabase();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new PharmacySearchError('not_authenticated', 'Iniciá sesión para buscar cobertura de receta.');
  }

  const { data, error } = await (supabase as any).rpc('find_pharmacy_coverage', {
    p_medication_ids: medicationIds,
    p_lat: latitude,
    p_lng: longitude,
    p_radius_m: radiusM,
  });

  if (error) {
    throw new PharmacySearchError('request_failed', error.message);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    pharmacy_id: row.pharmacy_id as string,
    pharmacy_name: row.pharmacy_name as string,
    address: (row.address as string) ?? null,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    matched_count: row.matched_count as number,
    required_count: row.required_count as number,
    coverage_percent: row.coverage_percent as number,
    distance_m: row.distance_m as number,
    total_price: (row.total_price as number) ?? null,
    last_synced_at: (row.last_synced_at as string) ?? null,
    matched_medications: (row.matched_medications as PharmacyCoverageMedication[]) ?? [],
  }));
}

export function formatHours(opening: string | null, closing: string | null): string {
  if (!opening || !closing) return 'Horario no informado';
  return `${opening.slice(0, 5)} - ${closing.slice(0, 5)}`;
}

export function isOpenNow(opening: string | null, closing: string | null): boolean | null {
  if (!opening || !closing) return null;
  const now = new Date();
  const [oh, om] = opening.split(':').map(Number);
  const [ch, cm] = closing.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  if (closeMins < openMins) {
    // cruza medianoche
    return mins >= openMins || mins <= closeMins;
  }
  return mins >= openMins && mins <= closeMins;
}

/**
 * Formatea una distancia en metros a un texto corto en español.
 */
export function formatDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM) || distanceM < 0) {
    return '';
  }
  if (distanceM < 1_000) {
    return `${Math.round(distanceM)} m`;
  }
  return `${(distanceM / 1_000).toFixed(1)} km`;
}
