-- ============================================================================
-- farmaGO — Migracion minima para soporte de sync Lioren en medications
-- ============================================================================
-- La tabla medications original no tiene columnas para rastrear origen externo.
-- Esta migracion agrega solo las necesarias para identificar de forma unica un
-- medicamento proveniente de una API externa (source + external_id) y para
-- conservar la descripcion que la API entrega.
--
-- No modifica la migracion inicial ni toca datos existentes.
-- source / external_id admiten NULL; el unique constraint de Postgres trata NULL
-- como valor distinto, por lo que los medicamentos existentes (NULL, NULL) no
-- colisionan entre si ni con los nuevos.
-- ============================================================================

alter table public.medications
  add column source text,
  add column external_id text,
  add column description text,
  add column presentation_unit text;

comment on column public.medications.source is
  'Proveedor/origen externo del catalogo. Ej: lioren, mvp_manual. NULL = desconocido/interno.';
comment on column public.medications.external_id is
  'Identificador del producto en el proveedor externo (source).';
comment on column public.medications.description is
  'Descripcion del producto tal como la entrega el proveedor externo.';
comment on column public.medications.presentation_unit is
  'Unidad de presentacion (producto.unidad) segun el proveedor externo.';

create unique index medications_source_external_uniq
  on public.medications (source, external_id)
  where source is not null and external_id is not null;

create index medications_source_idx on public.medications (source);
