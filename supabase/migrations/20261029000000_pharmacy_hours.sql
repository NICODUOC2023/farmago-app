-- Agrega horarios de atencion a farmacias y los expone en nearby_pharmacies.
alter table public.pharmacies
  add column if not exists opening_time time,
  add column if not exists closing_time time;

drop function if exists public.nearby_pharmacies(double precision, double precision, double precision, uuid, integer);

-- Actualiza RPC para devolver horarios.
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
  last_synced_at timestamptz,
  opening_time   time,
  closing_time   time
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
    s.last_synced_at,
    p.opening_time,
    p.closing_time
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

-- Asigna horarios demo: 50% 08:00-21:30, 50% 11:00-23:30 (deterministico por external_id).
update public.pharmacies
set opening_time = case when (ascii(substring(external_id from 1 for 1)) % 2 = 0) then '08:00'::time else '11:00'::time end,
    closing_time = case when (ascii(substring(external_id from 1 for 1)) % 2 = 0) then '21:30'::time else '23:30'::time end
where source in ('demo','farmex_demo','demo_commune');
