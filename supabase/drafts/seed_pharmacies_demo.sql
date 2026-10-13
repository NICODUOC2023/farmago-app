-- ----------------------------------------------------------------------------
-- Seed DEMO de farmacias (NO forma parte de las migraciones).
--
-- Objetivo: poblar algunas farmacias de Santiago para poder probar la búsqueda
-- `nearby_pharmacies` desde el mapa en un entorno de desarrollo/demo.
--
-- Cómo usarlo (manual, NO automático):
--   * Pegar en el SQL Editor del dashboard de Supabase, o
--   * psql "<connection-string>" -f supabase/drafts/seed_pharmacies_demo.sql
--
-- NO ejecutar en producción automáticamente. Es idempotente: volver a correrlo
-- no duplica filas (unique (source, external_id) + "on conflict do nothing").
--
-- Nota: pharmacy_stock NO se siembra acá porque requiere medications del
-- catálogo (que está vacío). Por eso la UI mostrará "sin stock informado"
-- hasta que existan medicamentos y stock reales.
-- ----------------------------------------------------------------------------

set search_path = public, extensions;

insert into public.pharmacies (name, chain, address, comuna, region, phone, location, source, external_id, is_active)
values
  (
    'Farmacia Providencia',
    'Farmago Demo',
    'Av. Providencia 1234',
    'Providencia',
    'Región Metropolitana',
    '+56 2 2345 6789',
    st_setsrid(st_makepoint(-70.6093, -33.4315), 4326)::geography,
    'demo',
    'demo-prov-01',
    true
  ),
  (
    'Farmacia Ñuñoa',
    'Farmago Demo',
    'Av. Irarrázaval 3210',
    'Ñuñoa',
    'Región Metropolitana',
    '+56 2 2345 6788',
    st_setsrid(st_makepoint(-70.5976, -33.4569), 4326)::geography,
    'demo',
    'demo-nun-01',
    true
  ),
  (
    'Farmacia Santiago Centro',
    'Farmago Demo',
    'Av. Libertador Bernardo O''Higgins 567',
    'Santiago',
    'Región Metropolitana',
    '+56 2 2345 6787',
    st_setsrid(st_makepoint(-70.6530, -33.4420), 4326)::geography,
    'demo',
    'demo-stg-01',
    true
  ),
  (
    'Farmacia Las Condes',
    'Farmago Demo',
    'Av. Apoquindo 4500',
    'Las Condes',
    'Región Metropolitana',
    '+56 2 2345 6786',
    st_setsrid(st_makepoint(-70.5860, -33.4168), 4326)::geography,
    'demo',
    'demo-lco-01',
    true
  ),
  (
    'Farmacia Maipú',
    'Farmago Demo',
    'Av. Pajaritos 2100',
    'Maipú',
    'Región Metropolitana',
    '+56 2 2345 6785',
    st_setsrid(st_makepoint(-70.7580, -33.5110), 4326)::geography,
    'demo',
    'demo-mai-01',
    true
  )
on conflict (source, external_id) do nothing;
