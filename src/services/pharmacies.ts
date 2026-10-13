import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

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
    phone: null,
  };
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

  return (data ?? []).map(normalize);
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
