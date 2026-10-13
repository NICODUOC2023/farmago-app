/**
 * Edge Function: sync-lioren
 *
 * Arquitectura: Lioren API -> Supabase Edge Function -> tablas Supabase -> app movil.
 *
 * Dos modos (parametro ?live=true):
 *   - DRY-RUN (default): lee Lioren, detecta forma de las respuestas, devuelve
 *     diagnostico. No inserta nada.
 *   - LIVE: crea/actualiza la farmacia manual de MVP y sincroniza los productos
 *     activos de Lioren hacia medications. NO inserta pharmacy_stock (stocks vacios).
 *
 * Para ejecutar:
 *   GET  -> diagnostico (dry-run)
 *   GET ?live=true -> sincronizacion real
 *
 * Lee sucursales, bodegas y productos (paginados) desde la API de Lioren usando el
 * token configurado como Edge Function Secret.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const LIORREN_BASE = "https://www.lioren.cl/api";

const TOKEN_SECRET_NAME = "LIORREN_API_TOKEN";

const TOKEN_CANDIDATES = [
  TOKEN_SECRET_NAME,
  "LIORREN_API_TOKEN",
  "LIOREN_API_TOKEN",
  "LIORREN_API_TOKEN",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getToken(): string | null {
  for (const name of TOKEN_CANDIDATES) {
    const v = Deno.env.get(name);
    if (v) return v;
  }
  return null;
}

interface LiorenResult {
  ok: boolean;
  status: number;
  data: unknown;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 25000;
const MAX_RETRY = 1;

async function liorenFetch(path: string): Promise<LiorenResult> {
  const token = getToken();
  if (!token) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: `No se encontro el secret ${TOKEN_SECRET_NAME} en Edge Function Secrets.`,
    };
  }

  let last: LiorenResult = { ok: false, status: 0, data: null, error: "sin intentos" };
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(LIORREN_BASE + path, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (res.status === 401) {
        return { ok: false, status: 401, data: null, error: "Token invalido o expirado (401)." };
      }
      if (res.status === 403) {
        return { ok: false, status: 403, data: null, error: "Sin permisos (403)." };
      }
      if (res.status === 429) {
        last = { ok: false, status: 429, data: null, error: "Rate limited (429)." };
        await sleep(1200);
        continue;
      }
      if (res.status >= 500) {
        last = { ok: false, status: res.status, data: null, error: `Error del servidor (${res.status}).` };
        await sleep(900);
        continue;
      }
      if (!res.ok) {
        return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}.` };
      }
      const data = await res.json();
      return { ok: true, status: res.status, data };
    } catch (e) {
      const isTimeout = e?.name === "AbortError";
      last = {
        ok: false,
        status: 0,
        data: null,
        error: isTimeout ? `Timeout (${DEFAULT_TIMEOUT_MS}ms) en ${path}.` : (e?.message ?? String(e)),
      };
      if (isTimeout) await sleep(800);
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}

function firstN<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function safeKeys(obj: unknown): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj as Record<string, unknown>);
  }
  return [];
}

function findIdField(sample: Record<string, unknown>): string | null {
  const candidates = ["id", "Id", "ID", "codigo", "codigo_sucursal", "bodega_id", "producto_id"];
  for (const c of candidates) {
    if (sample[c] !== undefined && sample[c] !== null) return c;
  }
  return null;
}

function findField(sample: Record<string, unknown>, regexes: RegExp[]): string | null {
  for (const k of Object.keys(sample)) {
    if (regexes.some((re) => re.test(k))) return k;
  }
  return null;
}

function extractList(payload: unknown): { items: Record<string, unknown>[]; container: string; containerKeys: string[] } {
  if (Array.isArray(payload)) {
    return { items: payload as Record<string, unknown>[], container: "array", containerKeys: [] };
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (Array.isArray(obj[k])) {
        return { items: obj[k] as Record<string, unknown>[], container: k, containerKeys: keys };
      }
    }
    return { items: [obj], container: "single-object", containerKeys: keys };
  }
  return { items: [], container: typeof payload, containerKeys: [] };
}

async function fetchProductos(): Promise<{
  items: Record<string, unknown>[];
  pages: number;
  errors: string[];
}> {
  const items: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const rpp = 100;
  const maxPages = 60;
  let page = 1;
  while (page <= maxPages) {
    const res = await liorenFetch(`/productos?activo=1&rpp=${rpp}&page=${page}`);
    if (!res.ok) {
      errors.push(`productos page ${page}: ${res.error ?? "error"}`);
      break;
    }
    const { items: pageItems, container } = extractList(res.data);
    if (!Array.isArray(res.data) && container === "string" && pageItems.length === 0) {
      errors.push(`productos page ${page}: formato inesperado (${container})`);
      break;
    }
    if (pageItems.length === 0) break;
    items.push(...pageItems);
    if (pageItems.length < rpp) break;
    page++;
  }
  return { items, pages: page, errors };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MANUAL_PHARMACY = {
  source: "mvp_manual",
  external_id: "mvp-antonio-varas-100",
  name: "Sucursal Antonio Varas",
  address: "Antonio Varas 100, Providencia, Santiago, Chile",
  phone: null,
  is_active: true,
  location: "SRID=4326;POINT(-70.6124173 -33.4430550)",
};

function normalizeMedication(p: Record<string, unknown>): Record<string, unknown> | null {
  const idField = findIdField(p);
  const nombreField = findField(p, [/nombre/i]);
  if (!idField || !nombreField) return null;
  const name = p[nombreField];
  if (name === null || name === undefined) return null;
  const externalId = p[idField];
  if (externalId === null || externalId === undefined) return null;

  const row: Record<string, unknown> = {
    name: String(name),
    source: "lioren",
    external_id: String(externalId),
  };

  const descField = findField(p, [/descripcion/i, /descrip/i]);
  if (descField && p[descField]) row["description"] = String(p[descField]);

  const unidadField = findField(p, [/unidad/i, /presentacion/i]);
  if (unidadField && p[unidadField]) row["presentation_unit"] = String(p[unidadField]);

  const codigoField = findField(p, [/codigo/i, /barra/i, /barcode/i, /ean/i]);
  if (codigoField && p[codigoField]) {
    const code = String(p[codigoField]).trim();
    if (code) row["barcode"] = code;
  }

  return row;
}

async function runLiveSync(): Promise<Response> {
  const token = getToken();
  if (!token) {
    return jsonResponse({ mode: "LIVE", ok: false, error: `Falta el secret ${TOKEN_SECRET_NAME}.` }, 500);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(
      { mode: "LIVE", ok: false, error: "SUPABASE_URL o SERVICE_ROLE_KEY no configurados en la funcion." },
      500,
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const summary: Record<string, unknown> = {
    mode: "LIVE",
    generated_at: new Date().toISOString(),
  };

  const whoami = await liorenFetch("/whoami");
  if (!whoami.ok) {
    return jsonResponse({ ...summary, ok: false, error: `whoami fallo: ${whoami.error}` }, 502);
  }
  const companyName = (whoami.data as Record<string, unknown>)?.nombre ?? "Lioren";

  const manualPharmacy = { ...MANUAL_PHARMACY, chain: companyName };

  const { error: pharmacyError } = await supabase
    .from("pharmacies")
    .upsert([manualPharmacy], { onConflict: "source,external_id", ignoreDuplicates: false });
  if (pharmacyError) {
    return jsonResponse(
      { ...summary, ok: false, step: "pharmacy_upsert", error: pharmacyError.message },
      502,
    );
  }
  summary.pharmacy = {
    source: manualPharmacy.source,
    external_id: manualPharmacy.external_id,
    name: manualPharmacy.name,
    chain: companyName,
    location: manualPharmacy.location,
    synced: true,
  };

  const { items: prodItems, errors: prodErrors } = await fetchProductos();
  const warnings: string[] = [];
  if (prodErrors.length > 0) warnings.push(...prodErrors);

  const seenExternalIds = new Set<string>();
  const seenBarcodes = new Set<string>();
  const medications: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const p of prodItems) {
    const m = normalizeMedication(p);
    if (!m) { skipped++; continue; }
    const extId = m["external_id"] as string;
    if (seenExternalIds.has(extId)) { skipped++; continue; }
    seenExternalIds.add(extId);
    const bc = m["barcode"] ? String(m["barcode"]) : null;
    if (bc) {
      if (seenBarcodes.has(bc)) {
        delete m["barcode"];
      } else {
        seenBarcodes.add(bc);
      }
    }
    medications.push(m);
  }

  const batchSize = 100;
  let synced = 0;
  const medErrors: string[] = [];
  for (let i = 0; i < medications.length; i += batchSize) {
    const batch = medications.slice(i, i + batchSize);
    const { error } = await supabase
      .from("medications")
      .upsert(batch, { onConflict: "source,external_id", ignoreDuplicates: false });
    if (error) {
      medErrors.push(`batch ${Math.floor(i / batchSize)}: ${error.message}`);
    } else {
      synced += batch.length;
    }
  }

  summary.medications = {
    fetched: prodItems.length,
    normalized: medications.length,
    skipped,
    upserted: synced,
    errors: medErrors.length ? medErrors : undefined,
  };
  summary.pharmacy_stock =
    "NO insertado: Lioren devuelve stocks vacios. No se inventan cantidad, disponibilidad ni precio.";
  summary.ok = medErrors.length === 0;
  if (warnings.length) summary.warnings = warnings;

  return jsonResponse(summary, 200);
}

function detectStockShape(producto: Record<string, unknown>): {
  stockField: string | null;
  stockKeys: string[];
  priceField: string | null;
} {
  let stockField: string | null = null;
  let stockKeys: string[] = [];
  for (const k of Object.keys(producto)) {
    const v = producto[k];
    if (Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === "object") {
      stockField = k;
      stockKeys = Object.keys(v[0] as Record<string, unknown>);
      break;
    }
  }
  const priceField = findField(producto, [
    /precioventabruto/i,
    /precio_bruto/i,
    /preciobruto/i,
    /precio_venta/i,
    /precio/i,
  ]);
  return { stockField, stockKeys, priceField };
}

function countProductosConStock(productos: Record<string, unknown>[]): number {
  let count = 0;
  for (const p of productos) {
    const { stockField } = detectStockShape(p);
    if (stockField) {
      const arr = p[stockField];
      if (Array.isArray(arr) && arr.length > 0) count++;
    } else {
      const cantidad = (p["cantidad"] ?? p["stock"] ?? p["existencias"]);
      if (typeof cantidad === "number" && cantidad > 0) count++;
      else if (typeof cantidad === "string" && parseInt(cantidad, 10) > 0) count++;
    }
  }
  return count;
}

function previewPharmacy(s: Record<string, unknown>): Record<string, unknown> | null {
  const idField = findIdField(s);
  if (!idField) return null;
  const nombre = findField(s, [/nombre/i]);
  const direccion = findField(s, [/direccion/i]);
  const telefono = findField(s, [/telefono/i, /fono/i, /phone/i]);
  const empresa = findField(s, [/empresa/i, /razon/i, /razon_social/i, /nombre_fantasia/i]);
  const comuna = findField(s, [/comuna/i, /ciudad/i]);
  const region = findField(s, [/region/i, /provincia/i]);
  const sii = findField(s, [/sii/i]);
  return {
    source: "lioren",
    external_id: String(s[idField]),
    name: nombre ? s[nombre] : null,
    address: direccion ? s[direccion] : null,
    phone: telefono ? s[telefono] : null,
    chain: empresa ? s[empresa] : "Lioren",
    comuna: comuna ? s[comuna] : null,
    region: region ? s[region] : null,
    sii_field_present: sii ? { field: sii, sample: s[sii] } : null,
    location: null,
  };
}

function previewMedication(p: Record<string, unknown>): Record<string, unknown> | null {
  const idField = findIdField(p);
  if (!idField) return null;
  const nombre = findField(p, [/nombre/i]);
  const descripcion = findField(p, [/descripcion/i, /descrip/i]);
  const unidad = findField(p, [/unidad/i, /presentacion/i, /forma/i]);
  const laboratorio = findField(p, [/laboratorio/i, /lab/i]);
  const barcode = findField(p, [/barra/i, /ean/i, /upc/i, /codigo/i]);
  return {
    external_id: String(p[idField]),
    name: nombre ? p[nombre] : null,
    description_field: descripcion ?? null,
    package_unit_field: unidad ?? null,
    laboratory_field: laboratorio ?? null,
    barcode_field: barcode ?? null,
    note: "medications no tiene columnas source/external_id/description/unidad; estos datos no se pueden persistir en medications sin una migracion.",
  };
}

function previewBodega(b: Record<string, unknown>): Record<string, unknown> | null {
  const idField = findIdField(b);
  if (!idField) return null;
  const sucursalField = findField(b, [/sucursal/i]);
  return {
    external_id: String(b[idField]),
    sucursal_link_field: sucursalField,
    sucursal_id_sample: sucursalField ? b[sucursalField] : null,
  };
}

function firstExternalIds(
  items: Record<string, unknown>[],
  n = 3,
): (string | number | null)[] {
  const out: (string | number | null)[] = [];
  for (const it of items) {
    if (out.length >= n) break;
    const idField = findIdField(it);
    if (idField) out.push(it[idField] as string | number);
  }
  return out;
}

function hasLocationFields(sample: Record<string, unknown>): { hasLat: boolean; hasLng: boolean; latField: string | null; lngField: string | null } {
  const latField = findField(sample, [/latitud/i, /^lat$/i, /lat/i]);
  const lngField = findField(sample, [/longitud/i, /^lng$/i, /^lon$/i, /lng/i, /lon/i]);
  return { hasLat: !!latField, hasLng: !!lngField, latField, lngField };
}

async function runVerify(): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse({ mode: "VERIFY", ok: false, error: "SUPABASE_URL / SERVICE_ROLE_KEY no configurados." }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const result: Record<string, unknown> = { mode: "VERIFY", generated_at: new Date().toISOString() };

  const { data: manualPharmacy, error: mpErr } = await supabase
    .from("pharmacies")
    .select("id, source, external_id, name, chain, is_active")
    .eq("source", "mvp_manual")
    .limit(1)
    .single();
  result.manual_pharmacy = mpErr ? { found: false, error: mpErr.message } : { found: true, ...manualPharmacy };

  const { count: medCount, error: medErr } = await supabase
    .from("medications")
    .select("id", { count: "exact", head: true })
    .eq("source", "lioren");
  result.lioren_medications = medErr ? { error: medErr.message } : { count: medCount };

  const { count: stockCount, error: stockErr } = await supabase
    .from("pharmacy_stock")
    .select("id", { count: "exact", head: true });
  result.pharmacy_stock_rows = stockErr ? { error: stockErr.message } : { count: stockCount, expected: 0 };

  const { data: nearby, error: nearErr } = await supabase
    .rpc("nearby_pharmacies", { p_lat: -33.4430550, p_lng: -70.6124173, p_radius_m: 2000, p_limit: 10 });
  const manualInNearby = Array.isArray(nearby)
    ? nearby.find((p: Record<string, unknown>) => p["source"] === "mvp_manual" || p["name"] === "Sucursal Antonio Varas")
    : null;
  result.nearby_pharmacies = nearErr
    ? { error: nearErr.message }
    : { returned: Array.isArray(nearby) ? nearby.length : 0, manual_pharmacy_present: !!manualInNearby, sample: manualInNearby ?? null };

  result.checks = {
    manual_pharmacy_exists: !!manualPharmacy && !mpErr,
    lioren_medications_upserted: (medCount ?? 0) > 0 && !medErr,
    no_pharmacy_stock: (stockCount ?? 0) === 0 && !stockErr,
    manual_in_nearby: !!manualInNearby && !nearErr,
  };

  const searchTerms = ['NIVEA', '75077334', 'DEO'];
  const searchResults: Record<string, unknown> = {};
  for (const term of searchTerms) {
    const escaped = term.replace(/[(),.:;*|&"'\\%_~=<>\s]/g, (ch) => `\\${ch}`);
    const orFilter = [
      `name.ilike.${escaped}*`,
      `name.ilike.*${escaped}*`,
      `barcode.ilike.*${escaped}*`,
      `description.ilike.*${escaped}*`,
    ].join(',');
    const { data, error } = await supabase
      .from('medications')
      .select('id, name, barcode')
      .or(orFilter)
      .limit(20);
    searchResults[term] = error
      ? { error: error.message }
      : { returned: data?.length ?? 0, sample_names: (data ?? []).slice(0, 5).map((r) => r.name) };
  }
  result.search_smoke_test = searchResults;

  return jsonResponse(result, 200);
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const liveParam = url.searchParams.get("live");
  const isLive = liveParam === "true" || liveParam === "1";
  const isVerify = url.searchParams.get("verify") === "true" || url.searchParams.get("verify") === "1";

  if (isVerify) {
    return await runVerify();
  }

  const report: Record<string, unknown> = {
    mode: isLive ? "LIVE" : "DRY-RUN",
    generated_at: new Date().toISOString(),
    warnings: [] as string[],
    mapping_problems: [] as string[],
  };

  if (isLive) {
    return await runLiveSync();
  }

  const steps: Record<string, unknown> = {};

  const whoami = await liorenFetch("/whoami");
  steps.whoami = {
    ok: whoami.ok,
    status: whoami.status,
    error: whoami.error ?? null,
    shape: Array.isArray(whoami.data)
      ? "array"
      : (whoami.data && typeof whoami.data === "object" ? "object" : typeof whoami.data),
    keys: whoami.data && typeof whoami.data === "object" && !Array.isArray(whoami.data)
      ? Object.keys(whoami.data as Record<string, unknown>)
      : [],
  };
  if (!whoami.ok) {
    (report.warnings as string[]).push(`whoami fallo: ${whoami.error}`);
    return new Response(JSON.stringify({ ...report, steps }, null, 2), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sucRes = await liorenFetch("/sucursales");
  if (!sucRes.ok) {
    (report.warnings as string[]).push(`sucursales fallo: ${sucRes.error}`);
    return new Response(JSON.stringify({ ...report, steps }, null, 2), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { items: sucItems, container: sucContainer, containerKeys: sucContainerKeys } = extractList(sucRes.data);
  const sucSample = sucItems[0] ?? {};
  const sucLocation = hasLocationFields(sucSample);

  steps.sucursales = {
    count: sucItems.length,
    container: sucContainer,
    container_keys: sucContainerKeys,
    sample_keys: safeKeys(sucSample),
    first_external_ids: firstExternalIds(sucItems, 3),
    location_fields: sucLocation,
  };

  const locRes = await liorenFetch("/localidades");
  if (!locRes.ok) {
    (report.warnings as string[]).push(`localidades fallo: ${locRes.error}`);
  } else {
    const { items: locItems, container: locContainer, containerKeys: locContainerKeys } = extractList(locRes.data);
    const locSample = locItems[0] ?? {};
    steps.localidades = {
      count: locItems.length,
      container: locContainer,
      container_keys: locContainerKeys,
      sample_keys: safeKeys(locSample),
      first_external_ids: firstExternalIds(locItems, 3),
      location_fields: hasLocationFields(locSample),
    };
  }

  const bodRes = await liorenFetch("/bodegas");
  if (!bodRes.ok) {
    (report.warnings as string[]).push(`bodegas fallo: ${bodRes.error}`);
    return new Response(JSON.stringify({ ...report, steps }, null, 2), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { items: bodItems, container: bodContainer, containerKeys: bodContainerKeys } = extractList(bodRes.data);
  const bodSample = bodItems[0] ?? {};
  const bodSucursalField = findField(bodSample, [/sucursal/i]);

  steps.bodegas = {
    count: bodItems.length,
    container: bodContainer,
    container_keys: bodContainerKeys,
    sample_keys: safeKeys(bodSample),
    first_external_ids: firstExternalIds(bodItems, 3),
    sucursal_link_field: bodSucursalField,
  };

  const { items: prodItems, pages: prodPages, errors: prodErrors } = await fetchProductos();
  if (prodErrors.length > 0) {
    (report.warnings as string[]).push(...prodErrors);
  }
  const prodSample = prodItems[0] ?? {};
  const stockShape = detectStockShape(prodSample);
  const productosConStock = countProductosConStock(prodItems);

  let stocksShape: Record<string, unknown> | null = null;
  for (const k of Object.keys(prodSample)) {
    const v = prodSample[k];
    if (Array.isArray(v)) {
      stocksShape = {
        field: k,
        type: "array",
        length: v.length,
        sample_item_keys: v.length > 0 && v[0] && typeof v[0] === "object"
          ? safeKeys(v[0])
          : null,
      };
      break;
    }
  }

  steps.productos = {
    count: prodItems.length,
    pages_fetched: prodPages,
    sample_keys: safeKeys(prodSample),
    first_external_ids: firstExternalIds(prodItems, 3),
    products_with_stock_gt0: productosConStock,
    detected_stock_field: stockShape.stockField,
    stock_item_keys: stockShape.stockKeys,
    detected_price_field: stockShape.priceField,
    array_fields_shape: stocksShape,
  };

  const samplePharmacy = sucItems.length > 0 ? previewPharmacy(sucSample) : null;
  const sampleMedication = prodItems.length > 0 ? previewMedication(prodSample) : null;
  const sampleBodega = bodItems.length > 0 ? previewBodega(bodSample) : null;

  const mappingProblems: string[] = [];

  if (!sucLocation.hasLat || !sucLocation.hasLng) {
    mappingProblems.push(
      "CRITICO: pharmacies.location es geography(Point,4326) NOT NULL. Lioren NO entrega lat/lng en sucursales. " +
        "Las sucursales no podran insertarse sin coordenadas reales ni apareceran en nearby_pharmacies. " +
        "Opciones: (a) volver location nullable, (b) geocodificar direcciones manualmente.",
    );
  }

  mappingProblems.push(
    "medications NO tiene columnas source, external_id, description ni unidad/presentation_unit. " +
      "Los datos de origen del producto (source, external_id, descripcion, unidad) no pueden persistirse en medications sin una migracion. " +
      "La unica columna natural para el match es name (y barcode si Lioren lo incluye).",
  );

  const missingMedCols: string[] = [];
  if (!findField(prodSample, [/nombre/i])) missingMedCols.push("nombre");
  if (missingMedCols.length > 0) {
    mappingProblems.push(`productos no contiene los campos esperados: ${missingMedCols.join(", ")}.`);
  }

  if (!stockShape.priceField) {
    mappingProblems.push(
      "No se detecto un campo de precio (precioventabruto / precio) en productos. pharmacy_stock.price quedaria null.",
    );
  }

  if (!stockShape.stockField) {
    mappingProblems.push(
      "No se detecto un array/stock anidado en productos. Para mapear pharmacy_stock hara falta conocer la forma real del stock (campo + claves).",
    );
  }

  if (!bodSucursalField) {
    mappingProblems.push(
      "bodegas no presenta un campo vinculado a sucursal (sucursal_id). No se podra relacionar bodega -> pharmacy para el stock.",
    );
  }

  const pharmacyStockNote =
    "pharmacy_stock tiene unico (pharmacy_id, medication_id). Si una sucursal tiene varias bodegas, " +
    "las cantidades deben agregarse por (sucursal, medicamento) antes de upsert. " +
    "pharmacy_stock.external_id puede guardar '${producto_id}:${bodega_id}' como referencia, " +
    "pero la unicidad real es (pharmacy_id, medication_id).";

  const idempotenceNote =
    "Idempotencia planeada: pharmacies por (source='lioren', external_id); " +
    "medications por name (o barcode) — sin external_id en la tabla; " +
    "pharmacy_stock por (pharmacy_id, medication_id) con upsert. " +
    "Se conserva last_synced_at para detectar obsoletos; no se borran registros que Lioren deje de devolver.";

  report.steps = steps;
  report.mapping_problems = mappingProblems;
  report.counts = {
    sucursales: sucItems.length,
    bodegas: bodItems.length,
    productos: prodItems.length,
    productos_con_stock_gt0: productosConStock,
  };
  report.samples = {
    pharmacy: samplePharmacy,
    medication: sampleMedication,
    bodega: sampleBodega,
  };
  report.notes = {
    pharmacy_stock: pharmacyStockNote,
    idempotence: idempotenceNote,
  };

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export {};
