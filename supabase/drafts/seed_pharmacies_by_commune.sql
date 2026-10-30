-- ============================================================================
-- farmaGO — SEED: una farmacia sintética por comuna de la RM
-- Fuente demo: nombres de árboles/flores de Chile. Datos sintéticos (no reales).
-- Idempotente. Ejecutar manualmente en Supabase SQL Editor.
-- ============================================================================

set search_path = public, extensions;

-- 1) Farmacias sintéticas (una por comuna)
insert into public.pharmacies (name, chain, address, comuna, region, location, source, external_id, is_active)
values
  ('Farmacia Arrayán Alhué','FarmaGO Demo','Municipalidad de Alhué','Alhué','Región Metropolitana',st_setsrid(st_makepoint(-71.099,-33.975),4326)::geography,'demo','demo-commune-alhue',true),
  ('Farmacia Boldo Buin','FarmaGO Demo','Municipalidad de Buin','Buin','Región Metropolitana',st_setsrid(st_makepoint(-70.743,-33.733),4326)::geography,'demo','demo-commune-buin',true),
  ('Farmacia Canelo Calera de Tango','FarmaGO Demo','Municipalidad de Calera de Tango','Calera de Tango','Región Metropolitana',st_setsrid(st_makepoint(-70.783,-33.625),4326)::geography,'demo','demo-commune-calera-de-tango',true),
  ('Farmacia Coihue Cerrillos','FarmaGO Demo','Municipalidad de Cerrillos','Cerrillos','Región Metropolitana',st_setsrid(st_makepoint(-70.718,-33.496),4326)::geography,'demo','demo-commune-cerrillos',true),
  ('Farmacia Lingue Cerro Navia','FarmaGO Demo','Municipalidad de Cerro Navia','Cerro Navia','Región Metropolitana',st_setsrid(st_makepoint(-70.736,-33.415),4326)::geography,'demo','demo-commune-cerro-navia',true),
  ('Farmacia Mañío Colina','FarmaGO Demo','Municipalidad de Colina','Colina','Región Metropolitana',st_setsrid(st_makepoint(-70.67,-33.2),4326)::geography,'demo','demo-commune-colina',true),
  ('Farmacia Olivillo Conchalí','FarmaGO Demo','Municipalidad de Conchalí','Conchalí','Región Metropolitana',st_setsrid(st_makepoint(-70.678,-33.383),4326)::geography,'demo','demo-commune-conchali',true),
  ('Farmacia Peumo Curacaví','FarmaGO Demo','Municipalidad de Curacaví','Curacaví','Región Metropolitana',st_setsrid(st_makepoint(-71.133,-33.4),4326)::geography,'demo','demo-commune-curacavi',true),
  ('Farmacia Quillay El Bosque','FarmaGO Demo','Municipalidad de El Bosque','El Bosque','Región Metropolitana',st_setsrid(st_makepoint(-70.666,-33.552),4326)::geography,'demo','demo-commune-el-bosque',true),
  ('Farmacia Roble El Monte','FarmaGO Demo','Municipalidad de El Monte','El Monte','Región Metropolitana',st_setsrid(st_makepoint(-71.0,-33.683),4326)::geography,'demo','demo-commune-el-monte',true),
  ('Farmacia Tepa Estación Central','FarmaGO Demo','Municipalidad de Estación Central','Estación Central','Región Metropolitana',st_setsrid(st_makepoint(-70.687,-33.456),4326)::geography,'demo','demo-commune-estacion-central',true),
  ('Farmacia Ulmo Huechuraba','FarmaGO Demo','Municipalidad de Huechuraba','Huechuraba','Región Metropolitana',st_setsrid(st_makepoint(-70.646,-33.366),4326)::geography,'demo','demo-commune-huechuraba',true),
  ('Farmacia Alerce Independencia','FarmaGO Demo','Municipalidad de Independencia','Independencia','Región Metropolitana',st_setsrid(st_makepoint(-70.663,-33.416),4326)::geography,'demo','demo-commune-independencia',true),
  ('Farmacia Araucaria Isla de Maipo','FarmaGO Demo','Municipalidad de Isla de Maipo','Isla de Maipo','Región Metropolitana',st_setsrid(st_makepoint(-70.9,-33.75),4326)::geography,'demo','demo-commune-isla-de-maipo',true),
  ('Farmacia Avellano La Cisterna','FarmaGO Demo','Municipalidad de La Cisterna','La Cisterna','Región Metropolitana',st_setsrid(st_makepoint(-70.662,-33.533),4326)::geography,'demo','demo-commune-la-cisterna',true),
  ('Farmacia Belloto La Florida','FarmaGO Demo','Municipalidad de La Florida','La Florida','Región Metropolitana',st_setsrid(st_makepoint(-70.59,-33.516),4326)::geography,'demo','demo-commune-la-florida',true),
  ('Farmacia Ciprés La Granja','FarmaGO Demo','Municipalidad de La Granja','La Granja','Región Metropolitana',st_setsrid(st_makepoint(-70.625,-33.533),4326)::geography,'demo','demo-commune-la-granja',true),
  ('Farmacia Ciruelillo La Pintana','FarmaGO Demo','Municipalidad de La Pintana','La Pintana','Región Metropolitana',st_setsrid(st_makepoint(-70.633,-33.583),4326)::geography,'demo','demo-commune-la-pintana',true),
  ('Farmacia Encina La Reina','FarmaGO Demo','Municipalidad de La Reina','La Reina','Región Metropolitana',st_setsrid(st_makepoint(-70.538,-33.451),4326)::geography,'demo','demo-commune-la-reina',true),
  ('Farmacia Espino Lampa','FarmaGO Demo','Municipalidad de Lampa','Lampa','Región Metropolitana',st_setsrid(st_makepoint(-70.883,-33.283),4326)::geography,'demo','demo-commune-lampa',true),
  ('Farmacia Guayacán Las Condes','FarmaGO Demo','Municipalidad de Las Condes','Las Condes','Región Metropolitana',st_setsrid(st_makepoint(-70.586,-33.417),4326)::geography,'demo','demo-commune-las-condes',true),
  ('Farmacia Hualo Lo Barnechea','FarmaGO Demo','Municipalidad de Lo Barnechea','Lo Barnechea','Región Metropolitana',st_setsrid(st_makepoint(-70.517,-33.35),4326)::geography,'demo','demo-commune-lo-barnechea',true),
  ('Farmacia Laureli Lo Espejo','FarmaGO Demo','Municipalidad de Lo Espejo','Lo Espejo','Región Metropolitana',st_setsrid(st_makepoint(-70.683,-33.517),4326)::geography,'demo','demo-commune-lo-espejo',true),
  ('Farmacia Luma Lo Prado','FarmaGO Demo','Municipalidad de Lo Prado','Lo Prado','Región Metropolitana',st_setsrid(st_makepoint(-70.725,-33.442),4326)::geography,'demo','demo-commune-lo-prado',true),
  ('Farmacia Maitén Macul','FarmaGO Demo','Municipalidad de Macul','Macul','Región Metropolitana',st_setsrid(st_makepoint(-70.598,-33.488),4326)::geography,'demo','demo-commune-macul',true),
  ('Farmacia Meli Maipú','FarmaGO Demo','Municipalidad de Maipú','Maipú','Región Metropolitana',st_setsrid(st_makepoint(-70.758,-33.511),4326)::geography,'demo','demo-commune-maipu',true),
  ('Farmacia Notro María Pinto','FarmaGO Demo','Municipalidad de María Pinto','María Pinto','Región Metropolitana',st_setsrid(st_makepoint(-71.133,-33.517),4326)::geography,'demo','demo-commune-maria-pinto',true),
  ('Farmacia Palo Santo Melipilla','FarmaGO Demo','Municipalidad de Melipilla','Melipilla','Región Metropolitana',st_setsrid(st_makepoint(-71.217,-33.683),4326)::geography,'demo','demo-commune-melipilla',true),
  ('Farmacia Radal Ñuñoa','FarmaGO Demo','Municipalidad de Ñuñoa','Ñuñoa','Región Metropolitana',st_setsrid(st_makepoint(-70.598,-33.457),4326)::geography,'demo','demo-commune-nunoa',true),
  ('Farmacia Tineo Padre Hurtado','FarmaGO Demo','Municipalidad de Padre Hurtado','Padre Hurtado','Región Metropolitana',st_setsrid(st_makepoint(-70.817,-33.567),4326)::geography,'demo','demo-commune-padre-hurtado',true),
  ('Farmacia Copihue Paine','FarmaGO Demo','Municipalidad de Paine','Paine','Región Metropolitana',st_setsrid(st_makepoint(-70.733,-33.8),4326)::geography,'demo','demo-commune-paine',true),
  ('Farmacia Añañuca Pedro Aguirre Cerda','FarmaGO Demo','Municipalidad de Pedro Aguirre Cerda','Pedro Aguirre Cerda','Región Metropolitana',st_setsrid(st_makepoint(-70.667,-33.483),4326)::geography,'demo','demo-commune-pedro-aguirre-cerda',true),
  ('Farmacia Huilli Peñaflor','FarmaGO Demo','Municipalidad de Peñaflor','Peñaflor','Región Metropolitana',st_setsrid(st_makepoint(-70.883,-33.6),4326)::geography,'demo','demo-commune-penaflor',true),
  ('Farmacia Chagual Peñalolén','FarmaGO Demo','Municipalidad de Peñalolén','Peñalolén','Región Metropolitana',st_setsrid(st_makepoint(-70.538,-33.489),4326)::geography,'demo','demo-commune-penalolen',true),
  ('Farmacia Puya Pirque','FarmaGO Demo','Municipalidad de Pirque','Pirque','Región Metropolitana',st_setsrid(st_makepoint(-70.583,-33.683),4326)::geography,'demo','demo-commune-pirque',true),
  ('Farmacia Alstroemeria Providencia','FarmaGO Demo','Municipalidad de Providencia','Providencia','Región Metropolitana',st_setsrid(st_makepoint(-70.609,-33.432),4326)::geography,'demo','demo-commune-providencia',true),
  ('Farmacia Azulillo Pudahuel','FarmaGO Demo','Municipalidad de Pudahuel','Pudahuel','Región Metropolitana',st_setsrid(st_makepoint(-70.76,-33.442),4326)::geography,'demo','demo-commune-pudahuel',true),
  ('Farmacia Calceolaria Puente Alto','FarmaGO Demo','Municipalidad de Puente Alto','Puente Alto','Región Metropolitana',st_setsrid(st_makepoint(-70.583,-33.617),4326)::geography,'demo','demo-commune-puente-alto',true),
  ('Farmacia Dahlia Quilicura','FarmaGO Demo','Municipalidad de Quilicura','Quilicura','Región Metropolitana',st_setsrid(st_makepoint(-70.75,-33.35),4326)::geography,'demo','demo-commune-quilicura',true),
  ('Farmacia Fucsia Quinta Normal','FarmaGO Demo','Municipalidad de Quinta Normal','Quinta Normal','Región Metropolitana',st_setsrid(st_makepoint(-70.698,-33.438),4326)::geography,'demo','demo-commune-quinta-normal',true),
  ('Farmacia Lapageria Recoleta','FarmaGO Demo','Municipalidad de Recoleta','Recoleta','Región Metropolitana',st_setsrid(st_makepoint(-70.636,-33.403),4326)::geography,'demo','demo-commune-recoleta',true),
  ('Farmacia Matico Renca','FarmaGO Demo','Municipalidad de Renca','Renca','Región Metropolitana',st_setsrid(st_makepoint(-70.717,-33.4),4326)::geography,'demo','demo-commune-renca',true),
  ('Farmacia Nalca San Bernardo','FarmaGO Demo','Municipalidad de San Bernardo','San Bernardo','Región Metropolitana',st_setsrid(st_makepoint(-70.7,-33.6),4326)::geography,'demo','demo-commune-san-bernardo',true),
  ('Farmacia Pehuén San Joaquín','FarmaGO Demo','Municipalidad de San Joaquín','San Joaquín','Región Metropolitana',st_setsrid(st_makepoint(-70.628,-33.488),4326)::geography,'demo','demo-commune-san-joaquin',true),
  ('Farmacia Raulí San José de Maipo','FarmaGO Demo','Municipalidad de San José de Maipo','San José de Maipo','Región Metropolitana',st_setsrid(st_makepoint(-70.35,-33.633),4326)::geography,'demo','demo-commune-san-jose-de-maipo',true),
  ('Farmacia Tepú San Miguel','FarmaGO Demo','Municipalidad de San Miguel','San Miguel','Región Metropolitana',st_setsrid(st_makepoint(-70.649,-33.498),4326)::geography,'demo','demo-commune-san-miguel',true),
  ('Farmacia Winter San Pedro','FarmaGO Demo','Municipalidad de San Pedro','San Pedro','Región Metropolitana',st_setsrid(st_makepoint(-71.467,-33.883),4326)::geography,'demo','demo-commune-san-pedro',true),
  ('Farmacia Yaretá San Ramón','FarmaGO Demo','Municipalidad de San Ramón','San Ramón','Región Metropolitana',st_setsrid(st_makepoint(-70.65,-33.533),4326)::geography,'demo','demo-commune-san-ramon',true),
  ('Farmacia Zapallo Santiago','FarmaGO Demo','Municipalidad de Santiago','Santiago','Región Metropolitana',st_setsrid(st_makepoint(-70.651,-33.437),4326)::geography,'demo','demo-commune-santiago',true),
  ('Farmacia Chilco Talagante','FarmaGO Demo','Municipalidad de Talagante','Talagante','Región Metropolitana',st_setsrid(st_makepoint(-70.933,-33.667),4326)::geography,'demo','demo-commune-talagante',true),
  ('Farmacia Chupalla Tiltil','FarmaGO Demo','Municipalidad de Tiltil','Tiltil','Región Metropolitana',st_setsrid(st_makepoint(-70.917,-33.083),4326)::geography,'demo','demo-commune-tiltil',true),
  ('Farmacia Lleuque Vitacura','FarmaGO Demo','Municipalidad de Vitacura','Vitacura','Región Metropolitana',st_setsrid(st_makepoint(-70.575,-33.392),4326)::geography,'demo','demo-commune-vitacura',true)
on conflict (source, external_id) do nothing;

-- 2) Stock sintético para los 5 medicamentos demo en cada farmacia
insert into public.pharmacy_stock (pharmacy_id, medication_id, is_available, quantity, price, currency, source, external_id, last_synced_at)
select p.id, m.id, true,
  (((ascii(substring(p.external_id from 12 for 1)) + ascii(substring(m.external_id from 7 for 1))) % 20) + 1)::int as qty,
  case m.external_id
    when 'demo-paracetamol' then 1500
    when 'demo-ibuprofeno' then 2100
    when 'demo-amoxicilina' then 3200
    when 'demo-loratadina' then 1800
    when 'demo-omeprazol' then 2600
  end::numeric(12,0) as price,
  'CLP', 'demo', 'demo-commune-stock-' || p.external_id || '-' || m.external_id, now()
from public.pharmacies p
cross join public.medications m
where p.source='demo' and p.external_id like 'demo-commune-%'
  and m.source='demo' and m.external_id in ('demo-paracetamol','demo-ibuprofeno','demo-amoxicilina','demo-loratadina','demo-omeprazol')
on conflict (pharmacy_id, medication_id) do update set
  is_available=excluded.is_available,
  quantity=excluded.quantity,
  price=excluded.price,
  last_synced_at=excluded.last_synced_at,
  updated_at=now();

-- Verificacion
select count(*) as pharmacies_commune from public.pharmacies where source='demo' and external_id like 'demo-commune-%';
select count(*) as stock_rows from public.pharmacy_stock where source='demo' and external_id like 'demo-commune-stock-%';
