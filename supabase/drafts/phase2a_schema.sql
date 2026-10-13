-- ============================================================================
-- farmaGO — Fase 2A: BORRADOR de esquema de base de datos  (revisión 3)
-- ============================================================================
-- ⚠️  ARCHIVO DE TRABAJO. NO EJECUTAR TODAVÍA.
--
-- Vive en supabase/drafts/ a propósito, FUERA de supabase/migrations/, para
-- que el CLI (`supabase db push`, `db reset`) NO lo detecte ni lo aplique.
--
-- Cambios de la revisión 3 (endurecimiento de privacidad):
--   * privacy_policy_versions: versiones vigentes por tipo de consentimiento.
--   * privacy_consents: historial APPEND-ONLY para el cliente. El cliente solo
--     puede SELECT. Otorgar/revocar solo vía grant_consent()/revoke_consent().
--   * has_active_consent(): valida user_id = auth.uid() y que la versión del
--     consentimiento sea la VIGENTE (no confía en datos del cliente).
--   * RLS: SELECT/DELETE de recetas y tratamientos NO exigen consentimiento;
--     INSERT/UPDATE sí. Exportar/eliminar/revocar nunca exigen consentimiento.
--   * privacy_requests: sin columna `notes`; el cliente solo crea (pending) y
--     consulta. No puede cambiar status/completed_at.
--   * Funciones SECURITY DEFINER con `set search_path = public, extensions`,
--     EXECUTE revocado a PUBLIC y concedido explícitamente. Sin SQL dinámico.
--   * profiles: email desde auth.users, no editable por el cliente.
--
-- Revisión semántica (3.1) sobre rev3:
--   * grant_consent(): ahora ACTUALIZA de versión. Si hay un consentimiento
--     activo de una versión anterior, lo revoca (conserva historial) e inserta
--     la versión vigente nueva, de forma atómica. Solo es idempotente cuando la
--     versión activa coincide con la solicitada.
--   * Seed de privacy_policy_versions con `on conflict (consent_type, version)
--     do nothing` (seguro ante re-ejecución accidental).
--   * privacy_requests: permiso de INSERT por columna, solo (user_id,
--     request_type); requested_at/completed_at/status usan DEFAULT del servidor.
--
-- Convenciones:
--   * PK UUID con gen_random_uuid().
--   * created_at / updated_at en tablas mutables + trigger set_updated_at().
--   * Catálogo: SELECT para authenticated, escritura solo service_role/admin.
--   * Datos personales/salud: RLS por auth.uid(). Sin policies públicas.
--   * Nunca se guarda la ubicación del usuario.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Extensiones
-- ----------------------------------------------------------------------------
create extension if not exists postgis;       -- geography(Point,4326), ST_DWithin
create extension if not exists pg_trgm;        -- búsqueda por similitud de nombres
create extension if not exists unaccent;       -- normalización de texto

-- ----------------------------------------------------------------------------
-- 1. Tipos ENUM
-- ----------------------------------------------------------------------------
create type public.treatment_source               as enum ('prescription', 'manual');
create type public.treatment_status               as enum ('active', 'paused', 'completed', 'cancelled');
create type public.intake_status                  as enum ('pending', 'taken', 'skipped', 'missed');
-- Sin 'uploaded': no se persiste imagen; el procesamiento es efímero.
create type public.prescription_status            as enum ('processing', 'extracted', 'confirmed', 'failed', 'archived');
create type public.prescription_item_match_status as enum ('pending', 'matched', 'ambiguous', 'unidentified');
create type public.recent_search_type             as enum ('text', 'medication', 'active_ingredient', 'pharmacy');
create type public.consent_type                   as enum (
  'health_data_processing',
  'prescription_processing',
  'privacy_policy',
  'terms_of_service',
  'marketing'
);
create type public.privacy_request_type           as enum ('access', 'rectification', 'deletion', 'portability', 'objection');
create type public.privacy_request_status         as enum ('pending', 'processing', 'completed', 'rejected');

-- ----------------------------------------------------------------------------
-- 2. Función/trigger updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. profiles  (cliente ↔ auth.users) — sin datos personales adicionales
--    NOTA: profiles.email es NOT NULL y se alimenta de auth.users.email.
--    Si el proyecto habilitara usuarios sin email (p. ej. auth por teléfono),
--    habría conflicto con NOT NULL: en ese caso deshabilitar auth por teléfono
--    o permitir email nullable (decisión pendiente, ver riesgos).
-- ----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  locale     text,
  timezone   text not null default 'America/Santiago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. active_ingredients
-- ----------------------------------------------------------------------------
create table public.active_ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint active_ingredients_name_unique unique (name)
);
create index active_ingredients_name_trgm
  on public.active_ingredients using gin (name gin_trgm_ops);
create trigger trg_active_ingredients_updated_at
  before update on public.active_ingredients
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. medications  (catálogo; NO se crean desde Gemini ni desde el cliente)
-- ----------------------------------------------------------------------------
create table public.medications (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  generic_name          text,
  form                  text,
  strength              text,
  presentation          text,
  laboratory            text,
  barcode               text,
  requires_prescription boolean not null default false,
  is_controlled         boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint medications_barcode_unique unique (barcode)
);
create index medications_name_trgm
  on public.medications using gin (name gin_trgm_ops);
create index medications_generic_name_trgm
  on public.medications using gin (generic_name gin_trgm_ops);
create trigger trg_medications_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. medication_active_ingredients  (N:M medicamento ↔ principio activo)
--    Catálogo: FK RESTRICT (sin CASCADE sobre catálogo).
-- ----------------------------------------------------------------------------
create table public.medication_active_ingredients (
  medication_id        uuid not null references public.medications (id) on delete restrict,
  active_ingredient_id uuid not null references public.active_ingredients (id) on delete restrict,
  is_primary           boolean not null default false,
  created_at           timestamptz not null default now(),
  primary key (medication_id, active_ingredient_id)
);
create index mai_active_ingredient_idx
  on public.medication_active_ingredients (active_ingredient_id);

-- ----------------------------------------------------------------------------
-- 7. pharmacies  (una fila = una sucursal física con ubicación)
-- ----------------------------------------------------------------------------
create table public.pharmacies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  chain       text,
  address     text,
  comuna      text,
  region      text,
  phone       text,
  location    geography(Point, 4326) not null,
  source      text,
  external_id text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pharmacies_external_unique unique (source, external_id)
);
create index pharmacies_location_gix
  on public.pharmacies using gist (location);
create index pharmacies_name_trgm
  on public.pharmacies using gin (name gin_trgm_ops);
create index pharmacies_active_idx
  on public.pharmacies (is_active);
create trigger trg_pharmacies_updated_at
  before update on public.pharmacies
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. pharmacy_stock  (estado actual; sin histórico)
--    Catálogo: FK RESTRICT (sin CASCADE sobre catálogo).
-- ----------------------------------------------------------------------------
create table public.pharmacy_stock (
  id             uuid primary key default gen_random_uuid(),
  pharmacy_id    uuid not null references public.pharmacies (id) on delete restrict,
  medication_id  uuid not null references public.medications (id) on delete restrict,
  is_available   boolean not null default false,
  quantity       integer,                    -- unidades de producto; null si la API no informa
  price          numeric(12, 0),
  currency       char(3) not null default 'CLP',
  source         text,                       -- API/proveedor de origen
  external_id    text,                       -- id del producto en el proveedor externo
  last_synced_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint pharmacy_stock_unique unique (pharmacy_id, medication_id),
  constraint pharmacy_stock_quantity_check check (quantity is null or quantity >= 0),
  constraint pharmacy_stock_price_check check (price is null or price >= 0)
);
create index pharmacy_stock_medication_idx
  on public.pharmacy_stock (medication_id);
create index pharmacy_stock_available_idx
  on public.pharmacy_stock (medication_id) where is_available;
create trigger trg_pharmacy_stock_updated_at
  before update on public.pharmacy_stock
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. prescriptions  (SIN imagen, SIN ocr_raw: solo datos estructurados)
-- ----------------------------------------------------------------------------
create table public.prescriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  status       public.prescription_status not null default 'processing',
  processed_at timestamptz,
  doctor_name  text,
  institution  text,
  issued_on    date,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index prescriptions_user_idx
  on public.prescriptions (user_id);
create index prescriptions_user_status_idx
  on public.prescriptions (user_id, status);
create trigger trg_prescriptions_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. prescription_items  (identificados y no identificados)
--     medication_id SET NULL (no se borra catálogo por datos de usuario).
-- ----------------------------------------------------------------------------
create table public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medication_id   uuid references public.medications (id) on delete set null,
  raw_name        text not null,
  raw_dose        text,
  raw_frequency   text,
  raw_duration    text,
  match_status    public.prescription_item_match_status not null default 'pending',
  confidence      numeric(4, 3),
  is_confirmed    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint prescription_items_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint prescription_items_match_consistency
    check ((match_status = 'matched') = (medication_id is not null))
);
create index prescription_items_prescription_idx
  on public.prescription_items (prescription_id);
create index prescription_items_medication_idx
  on public.prescription_items (medication_id);
create index prescription_items_match_status_idx
  on public.prescription_items (prescription_id, match_status);
create trigger trg_prescription_items_updated_at
  before update on public.prescription_items
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. treatments
--     Fuente de receta exige prescription_id (creación con confirmación, vía Edge Fn).
-- ----------------------------------------------------------------------------
create table public.treatments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  prescription_id uuid references public.prescriptions (id) on delete set null,
  source          public.treatment_source not null default 'manual',
  title           text,
  doctor_name     text,
  institution     text,
  notes           text,
  status          public.treatment_status not null default 'active',
  started_on      date,
  ended_on        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint treatments_source_prescription_check
    check (source <> 'prescription' or prescription_id is not null)
);
create index treatments_user_idx
  on public.treatments (user_id);
create index treatments_user_status_idx
  on public.treatments (user_id, status);
create index treatments_prescription_idx
  on public.treatments (prescription_id);
create trigger trg_treatments_updated_at
  before update on public.treatments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. treatment_medications
-- ----------------------------------------------------------------------------
create table public.treatment_medications (
  id              uuid primary key default gen_random_uuid(),
  treatment_id    uuid not null references public.treatments (id) on delete cascade,
  medication_id   uuid references public.medications (id) on delete set null,
  custom_name     text,
  dose            text,
  frequency       text,
  frequency_hours integer,
  doses_per_day   smallint,
  duration_days   integer,
  instructions    text,
  starts_on       date,
  ends_on         date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tm_frequency_hours_check
    check (frequency_hours is null or frequency_hours > 0),
  constraint tm_doses_per_day_check
    check (doses_per_day is null or (doses_per_day between 1 and 24)),
  constraint tm_duration_days_check
    check (duration_days is null or duration_days > 0),
  constraint tm_has_identity_check
    check (medication_id is not null or custom_name is not null)
);
create index tm_treatment_idx
  on public.treatment_medications (treatment_id);
create index tm_medication_idx
  on public.treatment_medications (medication_id);
create trigger trg_treatment_medications_updated_at
  before update on public.treatment_medications
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. treatment_schedules
-- ----------------------------------------------------------------------------
create table public.treatment_schedules (
  id                      uuid primary key default gen_random_uuid(),
  treatment_medication_id uuid not null references public.treatment_medications (id) on delete cascade,
  time_of_day             time not null,
  timezone                text not null default 'America/Santiago',
  days_of_week            smallint[] not null default '{1,2,3,4,5,6,7}',
  label                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint ts_days_check
    check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]),
  constraint ts_unique
    unique (treatment_medication_id, time_of_day)
);
create index ts_tm_idx
  on public.treatment_schedules (treatment_medication_id);
create trigger trg_treatment_schedules_updated_at
  before update on public.treatment_schedules
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 14. treatment_intakes  (cumplimiento, información mínima)
-- ----------------------------------------------------------------------------
create table public.treatment_intakes (
  id                      uuid primary key default gen_random_uuid(),
  treatment_medication_id uuid not null references public.treatment_medications (id) on delete cascade,
  schedule_id             uuid references public.treatment_schedules (id) on delete set null,
  scheduled_at            timestamptz not null,
  status                  public.intake_status not null default 'pending',
  taken_at                timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint ti_unique unique (treatment_medication_id, scheduled_at),
  constraint ti_taken_consistency
    check ((status = 'taken') = (taken_at is not null))
);
create index ti_tm_idx
  on public.treatment_intakes (treatment_medication_id);
create index ti_scheduled_idx
  on public.treatment_intakes (scheduled_at);
create trigger trg_treatment_intakes_updated_at
  before update on public.treatment_intakes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 15. favorite_pharmacies  (FK a catálogo RESTRICT; el usuario borra por user_id)
-- ----------------------------------------------------------------------------
create table public.favorite_pharmacies (
  user_id     uuid not null references auth.users (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (user_id, pharmacy_id)
);

-- ----------------------------------------------------------------------------
-- 16. favorite_medications  (FK a catálogo RESTRICT)
-- ----------------------------------------------------------------------------
create table public.favorite_medications (
  user_id       uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete restrict,
  created_at    timestamptz not null default now(),
  primary key (user_id, medication_id)
);

-- ----------------------------------------------------------------------------
-- 17. recent_searches  (máx. 15 por usuario; sin lat/lng)
-- ----------------------------------------------------------------------------
create table public.recent_searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  query         text not null,
  search_type   public.recent_search_type not null default 'text',
  medication_id uuid references public.medications (id) on delete set null,
  pharmacy_id   uuid references public.pharmacies (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index recent_searches_user_idx
  on public.recent_searches (user_id, created_at desc);

-- Poda automática: al insertar, conserva solo las últimas 15 del MISMO usuario.
-- Función de trigger (SECURITY DEFINER, sin argumentos del cliente, sin SQL dinámico).
create or replace function public.trim_recent_searches()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.recent_searches
  where user_id = new.user_id
    and id not in (
      select id
      from public.recent_searches
      where user_id = new.user_id
      order by created_at desc, id desc
      limit 15
    );
  return new;
end;
$$;
create trigger trg_trim_recent_searches
  after insert on public.recent_searches
  for each row execute function public.trim_recent_searches();

-- ----------------------------------------------------------------------------
-- 18. privacy_policy_versions  (versiones vigentes por tipo de consentimiento)
-- ----------------------------------------------------------------------------
create table public.privacy_policy_versions (
  id            uuid primary key default gen_random_uuid(),
  consent_type  public.consent_type not null,
  version       text not null,
  document_hash text,
  effective_at  timestamptz not null default now(),
  is_current    boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint privacy_policy_versions_unique unique (consent_type, version)
);
-- Garantiza UNA sola versión vigente por tipo de consentimiento.
create unique index privacy_policy_versions_current_unique
  on public.privacy_policy_versions (consent_type)
  where is_current;

-- Versiones iniciales.
-- Idempotente ante re-ejecución: si el par (consent_type, version) ya existe,
-- no hace nada (evita colisión con privacy_policy_versions_unique).
insert into public.privacy_policy_versions (consent_type, version, is_current) values
  ('privacy_policy',        'v1', true),
  ('terms_of_service',      'v1', true),
  ('health_data_processing','v1', true),
  ('prescription_processing','v1', true),
  ('marketing',             'v1', true)
on conflict (consent_type, version) do nothing;

-- ----------------------------------------------------------------------------
-- 19. privacy_consents  (historial append-only desde el cliente)
--     El cliente NO puede INSERT/UPDATE/DELETE; solo SELECT (historial).
--     La FK asegura que policy_version exista para el tipo.
-- ----------------------------------------------------------------------------
create table public.privacy_consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  consent_type   public.consent_type not null,
  policy_version text not null,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  constraint privacy_consents_policy_fk
    foreign key (consent_type, policy_version)
    references public.privacy_policy_versions (consent_type, version)
    on delete restrict
);
-- Impide duplicados ACTIVOS del mismo tipo (los revocados se conservan).
create unique index privacy_consents_active_unique
  on public.privacy_consents (user_id, consent_type)
  where revoked_at is null;
create index privacy_consents_user_idx
  on public.privacy_consents (user_id, consent_type);

-- ----------------------------------------------------------------------------
-- 20. privacy_requests  (sin `notes`: nada interno editable por el cliente)
-- ----------------------------------------------------------------------------
create table public.privacy_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  request_type public.privacy_request_type not null,
  status       public.privacy_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index privacy_requests_user_idx
  on public.privacy_requests (user_id, requested_at desc);

-- ============================================================================
-- 21. Triggers de perfil (alta y sincronización de email desde auth.users)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, email, locale, timezone)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'locale',   -- puede ser null
    'America/Santiago'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene profiles.email sincronizado si cambia el email en auth.users.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- ============================================================================
-- 22. Funciones de consentimiento
-- ============================================================================
-- 22.1 has_active_consent: NO recibe user_id ni versión del cliente.
--      Valida user_id = auth.uid() y que la versión sea la VIGENTE.
create or replace function public.has_active_consent(p_type public.consent_type)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.privacy_consents c
    join public.privacy_policy_versions v
      on v.consent_type = c.consent_type
     and v.version = c.policy_version
     and v.is_current
    where c.user_id = auth.uid()
      and c.consent_type = p_type
      and c.revoked_at is null
  );
$$;

-- 22.2 grant_consent: otorga consentimiento con now() del servidor.
--      La versión debe ser la VIGENTE; no acepta granted_at del cliente.
create or replace function public.grant_consent(
  p_consent_type   public.consent_type,
  p_policy_version text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user  uuid := auth.uid();
  v_id    uuid;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.privacy_policy_versions v
    where v.consent_type = p_consent_type
      and v.version = p_policy_version
      and v.is_current
  ) then
    raise exception 'La versión % no es la vigente para %',
      p_policy_version, p_consent_type
      using errcode = '22023';
  end if;

  -- Idempotente SOLO si ya hay un consentimiento ACTIVO de la MISMA versión.
  select id into v_id
  from public.privacy_consents
  where user_id = v_user
    and consent_type = p_consent_type
    and policy_version = p_policy_version
    and revoked_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  -- Cambio de versión: revoca cualquier consentimiento activo de versión
  -- anterior del mismo tipo (conserva el historial con revoked_at) y luego
  -- inserta la versión nueva. Ambas operaciones ocurren dentro de la misma
  -- llamada a la función (una sola transacción), por lo que son atómicas y no
  -- colisionan con el índice único parcial privacy_consents_active_unique
  -- (que solo cubre las filas con revoked_at is null).
  update public.privacy_consents
     set revoked_at = now()
   where user_id = v_user
     and consent_type = p_consent_type
     and revoked_at is null;

  insert into public.privacy_consents (user_id, consent_type, policy_version, granted_at)
  values (v_user, p_consent_type, p_policy_version, now())
  returning id into v_id;

  return v_id;
end;
$$;

-- 22.3 revoke_consent: marca revoked_at (no borra el historial).
create or replace function public.revoke_consent(p_consent_type public.consent_type)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  update public.privacy_consents
     set revoked_at = now()
   where user_id = v_user
     and consent_type = p_consent_type
     and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 22.4 revoke_all_consents: revoca todos los consentimientos activos.
create or replace function public.revoke_all_consents()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  update public.privacy_consents
     set revoked_at = now()
   where user_id = v_user
     and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============================================================================
-- 23. RLS
-- ============================================================================
-- 23.1 Catálogo: SELECT solo para authenticated. Sin escritura desde el cliente.
alter table public.active_ingredients            enable row level security;
alter table public.medications                   enable row level security;
alter table public.medication_active_ingredients enable row level security;
alter table public.pharmacies                    enable row level security;
alter table public.pharmacy_stock                enable row level security;

create policy active_ingredients_read on public.active_ingredients
  for select to authenticated using (true);
create policy medications_read on public.medications
  for select to authenticated using (true);
create policy medication_active_ingredients_read on public.medication_active_ingredients
  for select to authenticated using (true);
create policy pharmacies_read on public.pharmacies
  for select to authenticated using (true);
create policy pharmacy_stock_read on public.pharmacy_stock
  for select to authenticated using (true);

revoke insert, update, delete on public.active_ingredients            from anon, authenticated;
revoke insert, update, delete on public.medications                   from anon, authenticated;
revoke insert, update, delete on public.medication_active_ingredients from anon, authenticated;
revoke insert, update, delete on public.pharmacies                    from anon, authenticated;
revoke insert, update, delete on public.pharmacy_stock                from anon, authenticated;
grant select on public.active_ingredients            to authenticated;
grant select on public.medications                   to authenticated;
grant select on public.medication_active_ingredients to authenticated;
grant select on public.pharmacies                    to authenticated;
grant select on public.pharmacy_stock                to authenticated;

-- 23.2 profiles: leer y actualizar lo propio. El email NO es editable por el cliente.
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (locale, timezone) on public.profiles to authenticated;

-- 23.3 privacy_policy_versions: lectura para authenticated; sin escritura cliente.
alter table public.privacy_policy_versions enable row level security;
create policy privacy_policy_versions_read on public.privacy_policy_versions
  for select to authenticated using (true);
revoke all on public.privacy_policy_versions from anon, authenticated;
grant select on public.privacy_policy_versions to authenticated;

-- 23.4 privacy_consents: historial APPEND-ONLY. El cliente solo puede SELECT.
--      Otorgar/revocar solo vía grant_consent()/revoke_consent() (SECURITY DEFINER).
alter table public.privacy_consents enable row level security;
create policy privacy_consents_select_own on public.privacy_consents
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.privacy_consents from anon, authenticated;
grant select on public.privacy_consents to authenticated;

-- 23.5 privacy_requests: el cliente crea (pending) y consulta las propias.
--      No puede modificar status/completed_at/requested_at ni borrar.
--      Permisos POR COLUMNA en INSERT: el cliente solo aporta user_id y
--      request_type; status/requested_at/completed_at/created_at/id toman sus
--      DEFAULT (status='pending', timestamps del servidor).
alter table public.privacy_requests enable row level security;
create policy privacy_requests_select_own on public.privacy_requests
  for select to authenticated using (user_id = auth.uid());
create policy privacy_requests_insert_own on public.privacy_requests
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
revoke all on public.privacy_requests from anon, authenticated;
grant select on public.privacy_requests to authenticated;
grant insert (user_id, request_type) on public.privacy_requests to authenticated;

-- 23.6 prescriptions: SELECT/DELETE propios SIN consentimiento;
--      INSERT/UPDATE requieren consentimiento vigente de prescription_processing.
alter table public.prescriptions enable row level security;
create policy prescriptions_select_own on public.prescriptions
  for select to authenticated using (user_id = auth.uid());
create policy prescriptions_insert_own on public.prescriptions
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_active_consent('prescription_processing'));
create policy prescriptions_update_own on public.prescriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_active_consent('prescription_processing'));
create policy prescriptions_delete_own on public.prescriptions
  for delete to authenticated using (user_id = auth.uid());

-- 23.7 prescription_items: igual criterio (consentimiento solo en INSERT/UPDATE).
alter table public.prescription_items enable row level security;
create policy prescription_items_select_own on public.prescription_items
  for select to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = auth.uid()
  ));
create policy prescription_items_insert_own on public.prescription_items
  for insert to authenticated
  with check (
    public.has_active_consent('prescription_processing')
    and exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id and p.user_id = auth.uid()
    )
  );
create policy prescription_items_update_own on public.prescription_items
  for update to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = auth.uid()
  ))
  with check (
    public.has_active_consent('prescription_processing')
    and exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id and p.user_id = auth.uid()
    )
  );
create policy prescription_items_delete_own on public.prescription_items
  for delete to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = auth.uid()
  ));

-- 23.8 treatments: SELECT/DELETE propios SIN consentimiento;
--      INSERT/UPDATE requieren consentimiento vigente de health_data_processing.
alter table public.treatments enable row level security;
create policy treatments_select_own on public.treatments
  for select to authenticated using (user_id = auth.uid());
create policy treatments_insert_own on public.treatments
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_active_consent('health_data_processing'));
create policy treatments_update_own on public.treatments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_active_consent('health_data_processing'));
create policy treatments_delete_own on public.treatments
  for delete to authenticated using (user_id = auth.uid());

-- 23.9 treatment_medications (sin gate de consentimiento; se borran en cascada).
alter table public.treatment_medications enable row level security;
create policy treatment_medications_owner on public.treatment_medications
  for all to authenticated
  using (exists (
    select 1 from public.treatments t
    where t.id = treatment_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.treatments t
    where t.id = treatment_id and t.user_id = auth.uid()
  ));

-- 23.10 treatment_schedules
alter table public.treatment_schedules enable row level security;
create policy treatment_schedules_owner on public.treatment_schedules
  for all to authenticated
  using (exists (
    select 1 from public.treatment_medications tm
    join public.treatments t on t.id = tm.treatment_id
    where tm.id = treatment_medication_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.treatment_medications tm
    join public.treatments t on t.id = tm.treatment_id
    where tm.id = treatment_medication_id and t.user_id = auth.uid()
  ));

-- 23.11 treatment_intakes
alter table public.treatment_intakes enable row level security;
create policy treatment_intakes_owner on public.treatment_intakes
  for all to authenticated
  using (exists (
    select 1 from public.treatment_medications tm
    join public.treatments t on t.id = tm.treatment_id
    where tm.id = treatment_medication_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.treatment_medications tm
    join public.treatments t on t.id = tm.treatment_id
    where tm.id = treatment_medication_id and t.user_id = auth.uid()
  ));

-- 23.12 favoritos y búsquedas recientes
alter table public.favorite_pharmacies  enable row level security;
alter table public.favorite_medications enable row level security;
alter table public.recent_searches      enable row level security;

create policy favorite_pharmacies_owner on public.favorite_pharmacies
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorite_medications_owner on public.favorite_medications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recent_searches_owner on public.recent_searches
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- 24. RPC
-- ============================================================================
-- 24.1 Farmacias cercanas (sin persistir la ubicación del usuario).
create or replace function public.nearby_pharmacies(
  p_lat           double precision,
  p_lng           double precision,
  p_radius_m      double precision default 5000,
  p_medication_id uuid default null,
  p_limit         integer default 50
)
returns table (
  pharmacy_id    uuid,
  name           text,
  chain          text,
  address        text,
  latitude       double precision,
  longitude      double precision,
  distance_m     double precision,
  is_available   boolean,
  price          numeric(12, 0),
  quantity       integer,
  last_synced_at timestamptz
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    p.id,
    p.name,
    p.chain,
    p.address,
    st_y(p.location::geometry) as latitude,
    st_x(p.location::geometry) as longitude,
    st_distance(
      p.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_m,
    s.is_available,
    s.price,
    s.quantity,
    s.last_synced_at
  from public.pharmacies p
  left join public.pharmacy_stock s
    on s.pharmacy_id = p.id
   and (p_medication_id is null or s.medication_id = p_medication_id)
  where p.is_active
    and st_dwithin(
      p.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    and (p_medication_id is null or (s.is_available and s.medication_id is not null))
  order by distance_m asc
  limit greatest(1, least(p_limit, 200));
$$;

-- 24.2 Exportar los datos propios en JSON (SECURITY INVOKER => respeta RLS).
--      No exige consentimiento: el usuario debe poder exportar tras revocar.
--      No genera logs con datos de salud.
--      NOTA: si el JSON crece demasiado, se reemplazará por una Edge Function
--      con respuesta descargable (streaming).
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (
      select to_jsonb(p) from public.profiles p where p.id = auth.uid()
    ),
    'consents', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from public.privacy_consents c where c.user_id = auth.uid()
    ),
    'privacy_requests', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      from public.privacy_requests r where r.user_id = auth.uid()
    ),
    'treatments', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from public.treatments t where t.user_id = auth.uid()
    ),
    'treatment_medications', (
      select coalesce(jsonb_agg(to_jsonb(tm)), '[]'::jsonb)
      from public.treatment_medications tm
      join public.treatments t on t.id = tm.treatment_id
      where t.user_id = auth.uid()
    ),
    'treatment_schedules', (
      select coalesce(jsonb_agg(to_jsonb(ts)), '[]'::jsonb)
      from public.treatment_schedules ts
      join public.treatment_medications tm on tm.id = ts.treatment_medication_id
      join public.treatments t on t.id = tm.treatment_id
      where t.user_id = auth.uid()
    ),
    'treatment_intakes', (
      select coalesce(jsonb_agg(to_jsonb(ti)), '[]'::jsonb)
      from public.treatment_intakes ti
      join public.treatment_medications tm on tm.id = ti.treatment_medication_id
      join public.treatments t on t.id = tm.treatment_id
      where t.user_id = auth.uid()
    ),
    'prescriptions', (
      select coalesce(jsonb_agg(to_jsonb(pr)), '[]'::jsonb)
      from public.prescriptions pr where pr.user_id = auth.uid()
    ),
    'prescription_items', (
      select coalesce(jsonb_agg(to_jsonb(pi)), '[]'::jsonb)
      from public.prescription_items pi
      join public.prescriptions pr on pr.id = pi.prescription_id
      where pr.user_id = auth.uid()
    ),
    'favorite_pharmacies', (
      select coalesce(jsonb_agg(to_jsonb(fp)), '[]'::jsonb)
      from public.favorite_pharmacies fp where fp.user_id = auth.uid()
    ),
    'favorite_medications', (
      select coalesce(jsonb_agg(to_jsonb(fm)), '[]'::jsonb)
      from public.favorite_medications fm where fm.user_id = auth.uid()
    ),
    'recent_searches', (
      select coalesce(jsonb_agg(to_jsonb(rs)), '[]'::jsonb)
      from public.recent_searches rs where rs.user_id = auth.uid()
    )
  );
$$;

-- 24.3 Solicitar eliminación de cuenta (crea una privacy_request). Sin consentimiento.
--      SECURITY INVOKER: corre con RLS. Solo inserta (user_id, request_type);
--      el permiso por columna lo exige. status/requested_at usan DEFAULT.
create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.privacy_requests (user_id, request_type)
  values (auth.uid(), 'deletion')
  returning id into v_id;
  return v_id;
end;
$$;

-- ============================================================================
-- 25. Privilegios de ejecución de funciones
--     EXECUTE revocado a PUBLIC; concedido explícitamente a quien corresponde.
-- ============================================================================
revoke all on function public.set_updated_at()                                   from public;
revoke all on function public.trim_recent_searches()                             from public;
revoke all on function public.handle_new_user()                                  from public;
revoke all on function public.sync_profile_email()                               from public;
revoke all on function public.has_active_consent(public.consent_type)            from public;
revoke all on function public.grant_consent(public.consent_type, text)          from public;
revoke all on function public.revoke_consent(public.consent_type)               from public;
revoke all on function public.revoke_all_consents()                             from public;
revoke all on function public.export_my_data()                                  from public;
revoke all on function public.request_account_deletion()                        from public;
revoke all on function public.nearby_pharmacies(
  double precision, double precision, double precision, uuid, integer
) from public;

-- Trigger functions: ejecutadas por el motor; sin EXECUTE para clientes.
grant execute on function public.set_updated_at()      to service_role;
grant execute on function public.trim_recent_searches() to service_role;
grant execute on function public.handle_new_user()      to service_role;
grant execute on function public.sync_profile_email()   to service_role;

-- Funciones invocables por el cliente autenticado.
grant execute on function public.has_active_consent(public.consent_type)   to authenticated, service_role;
grant execute on function public.grant_consent(public.consent_type, text) to authenticated, service_role;
grant execute on function public.revoke_consent(public.consent_type)      to authenticated, service_role;
grant execute on function public.revoke_all_consents()                    to authenticated, service_role;
grant execute on function public.export_my_data()                         to authenticated, service_role;
grant execute on function public.request_account_deletion()               to authenticated, service_role;
grant execute on function public.nearby_pharmacies(
  double precision, double precision, double precision, uuid, integer
) to authenticated, service_role;

-- ============================================================================
-- 26. NOTAS DE PRIVACIDAD Y CUMPLIMIENTO (documentación)
-- ============================================================================
-- * Supabase, Google (Gemini) y las APIs de farmacias pueden actuar como
--   proveedores/encargados del tratamiento de datos. Antes de producción debe
--   revisarse la TRANSFERENCIA INTERNACIONAL DE DATOS y sus bases legales.
-- * MVP exclusivo para MAYORES DE 18 años: validar en la app y en el flujo de
--   registro. No se guarda birth_date.
-- * No se registran logs con nombres de medicamentos, tratamientos, OCR ni
--   datos de salud. Evitar payloads sensibles en logs de Edge Functions.
-- * La service_role key NUNCA debe incluirse en React Native ni en variables
--   EXPO_PUBLIC_*.
-- * Gemini y las APIs externas se invocan desde Edge Functions (Fase 2B).
-- * No se comparten datos personales, recetas ni tratamientos con farmacias.
-- * Sin SQL dinámico en ninguna función; sin SQL controlado por el cliente.
-- * Eliminación de cuenta: el borrado definitivo se ejecuta server-side con la
--   Admin API (service_role, nunca desde el cliente); el CASCADE limpia el resto.

commit;

-- ============================================================================
-- PENDIENTE (Fase 2B) — Edge Functions (no incluidas en este borrador)
--   * prescription-ocr: recibe la imagen de forma transitoria, llama a Gemini,
--     guarda SOLO metadatos + prescription_items y descarta la imagen.
--   * medication-match: matchea raw_name contra medications (pg_trgm). Nunca
--     crea medicamentos nuevos automáticamente.
--   * create-treatment-from-prescription: exige prescriptions.confirmed_at y
--     consentimiento activo; crea treatment/medications/schedules.
--   * pharmacy-stock-sync: cron; upsert de pharmacy_stock con service_role.
--   * account-deletion: usa la Admin API (service_role, server-side) para
--     eliminar definitivamente al usuario.
-- ============================================================================
