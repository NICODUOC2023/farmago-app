-- ============================================================================
-- farmaGO — SEED DEMO: medicamentos de prueba + stock en la farmacia manual
-- ============================================================================
-- Datos FICTICIOS de demostracion. Fuente 'demo', separados de los datos
-- reales source='lioren' que sincroniza la Edge Function sync-lioren.
--
-- Crea 5 medicamentos de prueba y sus filas de pharmacy_stock vinculadas a la
-- farmacia manual (source='mvp_manual', external_id='mvp-antonio-varas-100').
--
-- Precios en CLP (campo numeric(12,0)) y cantidades son claramente ficticios.
--
-- Idempotente: pensado para ejecutarse manualmente en el SQL Editor de
-- Supabase cuando se quiera disponibilizar el demo del mapa con stock.
-- NO ejecutar automaticamente ni en migraciones.
-- ============================================================================

insert into public.medications (name, barcode, presentation, description, presentation_unit, source, external_id)
values
  ('Paracetamol 500 mg', 'DEMO-001', 'Caja x 16 comprimidos', 'Analgésico y antipirético', 'Comprimido', 'demo', 'demo-paracetamol'),
  ('Ibuprofeno 400 mg',  'DEMO-002', 'Caja x 20 comprimidos', 'Antiinflamatorio no esteroideo', 'Comprimido', 'demo', 'demo-ibuprofeno'),
  ('Amoxicilina 500 mg', 'DEMO-003', 'Caja x 12 cápsulas', 'Antibiótico de amplio espectro',     'Cápsula',   'demo', 'demo-amoxicilina'),
  ('Loratadina 10 mg',   'DEMO-004', 'Caja x 10 comprimidos', 'Antihistamínico',                   'Comprimido', 'demo', 'demo-loratadina'),
  ('Omeprazol 20 mg',    'DEMO-005', 'Caja x 14 cápsulas',   'Inhibidor de la bomba de protones',  'Cápsula',   'demo', 'demo-omeprazol')
on conflict (barcode) do update set
  name            = excluded.name,
  presentation    = excluded.presentation,
  description     = excluded.description,
  presentation_unit = excluded.presentation_unit,
  source          = excluded.source,
  external_id     = excluded.external_id,
  updated_at      = now();

insert into public.pharmacy_stock (pharmacy_id, medication_id, is_available, quantity, price, currency, source, external_id)
select
  p.id,
  m.id,
  true,
  v.qty,
  v.price,
  'CLP',
  'demo',
  'demo-stock-' || m.external_id
from (values
  ('demo-paracetamol',  120, 1500),
  ('demo-ibuprofeno',    80, 2100),
  ('demo-amoxicilina',   45, 3200),
  ('demo-loratadina',    60, 1800),
  ('demo-omeprazol',     30, 2600)
) as v(ext_id, qty, price)
join public.medications m on m.source = 'demo' and m.external_id = v.ext_id
join public.pharmacies  p on p.source = 'mvp_manual'
on conflict (pharmacy_id, medication_id) do update set
  is_available   = excluded.is_available,
  quantity       = excluded.quantity,
  price          = excluded.price,
  source         = excluded.source,
  external_id    = excluded.external_id,
  last_synced_at = now();
