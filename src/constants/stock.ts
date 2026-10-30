// Constantes compartidas para evaluar la frescura del stock de farmacias.
export const STOCK_FRESHNESS_MS = 12 * 60 * 60 * 1000;

export function isStockFresh(lastSyncedAt: string | null): boolean {
  if (!lastSyncedAt) return false;
  const ts = Date.parse(lastSyncedAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= STOCK_FRESHNESS_MS;
}

export function formatLastSynced(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'sin fecha de actualización';
  const ts = Date.parse(lastSyncedAt);
  if (Number.isNaN(ts)) return 'sin fecha de actualización';
  return new Date(ts).toLocaleString('es-CL');
}
