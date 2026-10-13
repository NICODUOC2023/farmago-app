-- ============================================================================
-- farmaGO — Correccion: unique index NO parcial para upsert de sync Lioren
-- ============================================================================
-- El indice parcial (WHERE source IS NOT NULL AND external_id IS NOT NULL) no es
-- reconocido por PostgREST para la clausula ON CONFLICT del upsert. Se reemplaza
-- por un unique index completo en (source, external_id).
--
-- Esto es seguro porque la tabla medications esta vacia en este punto (el primer
-- sync fallo en todos los lotes y nunca se insertaron filas). Ademas, Postgres
-- considera NULL <> NULL en un unique index, por lo que los medicamentos internos
-- futuros con (NULL, NULL) no colisionaran entre si.
-- ============================================================================

drop index if exists public.medications_source_external_uniq;

create unique index medications_source_external_uniq
  on public.medications (source, external_id);
