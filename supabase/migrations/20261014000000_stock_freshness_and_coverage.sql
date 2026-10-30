-- ============================================================================
-- farmaGO — Fase A/B: stock vigente (12 h) + RPC de cobertura de receta
-- ----------------------------------------------------------------------------
-- NO EJECUTADA. Archivo de migracion para aplicar manualmente en desarrollo.
-- ============================================================================

-- 1) Reemplaza nearby_pharmacies para considerar stock vigente (<= 12 h).
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
    and (
      p_medication_id is null
      or (
        s.is_available
        and s.medication_id is not null
        and s.last_synced_at >= now() - interval '12 hours'
      )
    )
  order by distance_m asc
  limit greatest(1, least(p_limit, 200));
$$;

-- 2) RPC de cobertura para recetas con varios medicamentos.
create or replace function public.find_pharmacy_coverage(
  p_medication_ids uuid[],
  p_lat            double precision,
  p_lng            double precision,
  p_radius_m       integer default 5000
)
returns table (
  pharmacy_id          uuid,
  pharmacy_name        text,
  address              text,
  latitude             double precision,
  longitude            double precision,
  matched_count        integer,
  required_count       integer,
  coverage_percent     numeric(5,2),
  distance_m           double precision,
  total_price          numeric(12,0),
  last_synced_at       timestamptz,
  matched_medications  jsonb
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with required as (
    select count(distinct m.id)::integer as req
    from public.medications m
    where m.id = any(p_medication_ids)
  ),
  pharmacies_in_radius as (
    select p.id, p.name, p.address,
           st_y(p.location::geometry) as latitude,
           st_x(p.location::geometry) as longitude,
           st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
    from public.pharmacies p
    where p.is_active
      and st_dwithin(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  ),
  matched as (
    select
      pir.id as pharmacy_id,
      s.medication_id,
      m.name as medication_name,
      s.price,
      s.quantity,
      s.last_synced_at
    from pharmacies_in_radius pir
    join public.pharmacy_stock s on s.pharmacy_id = pir.id
    join public.medications m on m.id = s.medication_id
    where s.medication_id = any(p_medication_ids)
      and s.is_available = true
      and s.last_synced_at >= now() - interval '12 hours'
  ),
  agg as (
    select
      pir.id as pharmacy_id,
      pir.name as pharmacy_name,
      pir.address,
      pir.latitude,
      pir.longitude,
      pir.distance_m,
      (select req from required) as required_count,
      count(distinct mt.medication_id)::integer as matched_count,
      coalesce(sum(mt.price), 0)::numeric(12,0) as total_price,
      min(mt.last_synced_at) as last_synced_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'medication_id', mt.medication_id,
            'name', mt.medication_name,
            'price', mt.price,
            'quantity', mt.quantity,
            'last_synced_at', mt.last_synced_at
          )
        ) filter (where mt.medication_id is not null),
        '[]'::jsonb
      ) as matched_medications
    from pharmacies_in_radius pir
    left join matched mt on mt.pharmacy_id = pir.id
    group by pir.id, pir.name, pir.address, pir.latitude, pir.longitude, pir.distance_m
  )
  select
    a.pharmacy_id,
    a.pharmacy_name,
    a.address,
    a.latitude,
    a.longitude,
    a.matched_count,
    a.required_count,
    case when a.required_count > 0
         then round((a.matched_count::numeric / a.required_count::numeric) * 100, 2)
         else 0::numeric end as coverage_percent,
    a.distance_m,
    a.total_price,
    a.last_synced_at,
    a.matched_medications
  from agg a
  order by
    a.matched_count desc,
    a.last_synced_at desc nulls last,
    a.distance_m asc,
    a.total_price asc nulls last;
$$;

-- Privilegios
revoke all on function public.find_pharmacy_coverage(uuid[], double precision, double precision, integer) from public;
grant execute on function public.find_pharmacy_coverage(uuid[], double precision, double precision, integer) to authenticated, service_role;
