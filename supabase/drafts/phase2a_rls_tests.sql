-- ============================================================================
-- farmaGO — Fase 2A: PRUEBAS DE RLS  (revisión 3)
-- ============================================================================
-- ⚠️  ARCHIVO DE TRABAJO. NO EJECUTAR TODAVÍA.
--
-- Requiere pgTAP + los helpers de prueba de Supabase (`tests` schema), que
-- provee el CLI en el entorno local:
--
--     supabase test db
--
-- Las pruebas corren dentro de una transacción que termina en ROLLBACK, por lo
-- que no dejan datos. Cada prueba cambia la identidad con
-- tests.authenticate_as() / tests.clear_authentication(); eso fija el rol
-- `authenticated` y el claim `request.jwt.claims.sub`, de modo que auth.uid()
-- devuelve el usuario simulado.
--
-- Convención de identificadores: 'user_a' y 'user_b'.
-- ============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- ----------------------------------------------------------------------------
-- 0. Fixtures: dos usuarios
-- ----------------------------------------------------------------------------
select tests.create_supabase_user('user_a');
select tests.create_supabase_user('user_b');

-- ============================================================================
-- BLOQUE 1 — consentimiento: alta, upgrade de versión y vigencia
-- ============================================================================

-- 1. A otorga prescription_processing v1 (versión vigente del seed).
select tests.authenticate_as('user_a');
select lives_ok(
  $$ select public.grant_consent('prescription_processing', 'v1') $$,
  'A puede otorgar consentimiento prescription_processing v1 (vigente)'
);

-- 2. Rechazo de versión NO vigente (v999 no existe / no es current).
select throws_ok(
  $$ select public.grant_consent('prescription_processing', 'v999') $$,
  '22023',
  null,
  'grant_consent rechaza una versión que no es la vigente'
);

-- 3. Idempotencia: volver a otorgar la MISMA versión activa no duplica.
select lives_ok(
  $$ select public.grant_consent('prescription_processing', 'v1') $$,
  'grant_consent es idempotente con la misma versión activa'
);
select is(
  (select count(*) from public.privacy_consents
    where user_id = tests.get_supabase_uid('user_a')
      and consent_type = 'prescription_processing'
      and revoked_at is null),
  1::bigint,
  'Solo hay un consentimiento activo de prescription_processing para A'
);

-- 4. Upgrade de versión: se publica v2 como vigente y A otorga v2.
--    Como `authenticated` no puede escribir privacy_policy_versions, se hace
--    con identidad de servicio (clear_authentication => rol del test runner).
select tests.clear_authentication();
update public.privacy_policy_versions
   set is_current = false
 where consent_type = 'prescription_processing' and version = 'v1';
insert into public.privacy_policy_versions (consent_type, version, is_current)
values ('prescription_processing', 'v2', true);

select tests.authenticate_as('user_a');
select lives_ok(
  $$ select public.grant_consent('prescription_processing', 'v2') $$,
  'A puede otorgar la nueva versión vigente v2'
);

-- La fila antigua v1 queda REVOCADA (historial conservado)...
select is(
  (select count(*) from public.privacy_consents
    where user_id = tests.get_supabase_uid('user_a')
      and consent_type = 'prescription_processing'
      and policy_version = 'v1'
      and revoked_at is not null),
  1::bigint,
  'El consentimiento v1 de A quedó revocado (historial conservado)'
);
-- ...y el activo es exactamente uno, con versión v2.
select is(
  (select policy_version from public.privacy_consents
    where user_id = tests.get_supabase_uid('user_a')
      and consent_type = 'prescription_processing'
      and revoked_at is null),
  'v2'::text,
  'El consentimiento activo de A pasó a v2 (sin colisión con el índice parcial)'
);

-- ============================================================================
-- BLOQUE 2 — sin consentimiento no se escribe; con consentimiento sí
-- ============================================================================

-- 5. Sin health_data_processing, A NO puede crear un tratamiento.
select tests.authenticate_as('user_a');
select throws_ok(
  $$ insert into public.treatments (user_id, source)
     values (tests.get_supabase_uid('user_a'), 'manual') $$,
  '42501',
  null,
  'Sin health_data_processing, A no puede insertar un tratamiento'
);

-- 6. A otorga health_data_processing v1 y ahora sí puede crear tratamiento.
select lives_ok(
  $$ select public.grant_consent('health_data_processing', 'v1') $$,
  'A otorga health_data_processing v1'
);
select lives_ok(
  $$ insert into public.treatments (user_id, source)
     values (tests.get_supabase_uid('user_a'), 'manual') $$,
  'Con health_data_processing vigente, A puede crear un tratamiento'
);

-- 7. Con prescription_processing v2 vigente, A puede insertar una receta.
select lives_ok(
  $$ insert into public.prescriptions (user_id, status)
     values (tests.get_supabase_uid('user_a'), 'processing') $$,
  'Con prescription_processing vigente, A puede insertar una receta'
);

-- ============================================================================
-- BLOQUE 3 — aislamiento entre A y B
-- ============================================================================

-- 8. B no lee la receta de A.
select tests.clear_authentication();
select tests.authenticate_as('user_b');
select is(
  (select count(*) from public.prescriptions
    where user_id = tests.get_supabase_uid('user_a')),
  0::bigint,
  'B no puede leer las recetas de A'
);

-- 9. B no lee el tratamiento de A.
select is(
  (select count(*) from public.treatments
    where user_id = tests.get_supabase_uid('user_a')),
  0::bigint,
  'B no puede leer los tratamientos de A'
);

-- 10. B no puede modificar (UPDATE) datos de A: 0 filas afectadas.
select is(
  (with upd as (
     update public.treatments set status = 'cancelled'
      where user_id = tests.get_supabase_uid('user_a')
      returning 1
   ) select count(*) from upd),
  0::bigint,
  'B no puede modificar el tratamiento de A (0 filas)'
);

-- 11. A no puede leer datos de B.
select tests.clear_authentication();
select tests.authenticate_as('user_a');
select is(
  (select count(*) from public.treatments
    where user_id = tests.get_supabase_uid('user_b')),
  0::bigint,
  'A no puede leer los tratamientos de B'
);

-- ============================================================================
-- BLOQUE 4 — revocar consentimiento: se bloquea escritura, se permite
--            consultar y eliminar
-- ============================================================================

-- 12. A revoca prescription_processing y health_data_processing.
select tests.authenticate_as('user_a');
select lives_ok(
  $$ select public.revoke_consent('prescription_processing') $$,
  'A revoca prescription_processing'
);
select lives_ok(
  $$ select public.revoke_consent('health_data_processing') $$,
  'A revoca health_data_processing'
);

-- 13. Tras revocar, A NO puede ACTUALIZAR recetas (WITH CHECK de consentimiento).
select throws_ok(
  $$ update public.prescriptions set status = 'confirmed'
      where user_id = tests.get_supabase_uid('user_a') $$,
  '42501',
  null,
  'Tras revocar consentimiento, A no puede actualizar sus recetas'
);

-- 14. Tras revocar, A NO puede ACTUALIZAR tratamientos.
select throws_ok(
  $$ update public.treatments set status = 'paused'
      where user_id = tests.get_supabase_uid('user_a') $$,
  '42501',
  null,
  'Tras revocar consentimiento, A no puede actualizar sus tratamientos'
);

-- 15. Tras revocar, A SÍ puede CONSULTAR sus recetas (SELECT sin gate).
select ok(
  (select count(*) from public.prescriptions
    where user_id = tests.get_supabase_uid('user_a')) >= 1,
  'Tras revocar consentimiento, A puede consultar sus recetas'
);

-- 16. Tras revocar, A SÍ puede CONSULTAR sus tratamientos.
select ok(
  (select count(*) from public.treatments
    where user_id = tests.get_supabase_uid('user_a')) >= 1,
  'Tras revocar consentimiento, A puede consultar sus tratamientos'
);

-- 17. Tras revocar, A SÍ puede ELIMINAR sus recetas (DELETE sin gate).
select lives_ok(
  $$ delete from public.prescriptions
      where user_id = tests.get_supabase_uid('user_a') $$,
  'Tras revocar consentimiento, A puede eliminar sus recetas'
);

-- 18. Tras revocar, A SÍ puede ELIMINAR sus tratamientos.
select lives_ok(
  $$ delete from public.treatments
      where user_id = tests.get_supabase_uid('user_a') $$,
  'Tras revocar consentimiento, A puede eliminar sus tratamientos'
);

-- ============================================================================
-- BLOQUE 5 — exportación / borrado propios no exigen consentimiento
-- ============================================================================

-- 19. export_my_data() sigue disponible tras revocar (SECURITY INVOKER, RLS).
select lives_ok(
  $$ select public.export_my_data() $$,
  'A puede exportar sus datos tras revocar consentimiento'
);
select lives_ok(
  $$ select public.request_account_deletion() $$,
  'A puede solicitar eliminación de cuenta tras revocar consentimiento'
);

-- ============================================================================
-- BLOQUE 6 — tablas de privacidad: sin escritura directa desde el cliente
-- ============================================================================

-- 20. A no puede escribir directamente en privacy_consents (ni siquiera leer
--     filas ajenas); INSERT/UPDATE/DELETE están revocados a nivel de tabla.
select throws_ok(
  $$ insert into public.privacy_consents (user_id, consent_type, policy_version)
     values (tests.get_supabase_uid('user_a'), 'marketing', 'v1') $$,
  '42501',
  null,
  'A no puede insertar directamente en privacy_consents'
);
select throws_ok(
  $$ update public.privacy_consents set revoked_at = now()
      where user_id = tests.get_supabase_uid('user_a') $$,
  '42501',
  null,
  'A no puede actualizar directamente privacy_consents'
);
select throws_ok(
  $$ delete from public.privacy_consents
      where user_id = tests.get_supabase_uid('user_a') $$,
  '42501',
  null,
  'A no puede borrar directamente privacy_consents'
);

-- 21. A no puede cambiar el status de su privacy_request (sin UPDATE).
select throws_ok(
  $$ update public.privacy_requests set status = 'completed'
      where user_id = tests.get_supabase_uid('user_a') $$,
  '42501',
  null,
  'A no puede cambiar el status de su privacy_request'
);

-- 22. A no puede fijar requested_at/completed_at ni status al insertar:
--     el permiso por columna solo permite (user_id, request_type).
select throws_ok(
  $$ insert into public.privacy_requests (user_id, request_type, status)
     values (tests.get_supabase_uid('user_a'), 'access', 'completed') $$,
  '42501',
  null,
  'A no puede definir status al crear una privacy_request'
);
select throws_ok(
  $$ insert into public.privacy_requests (user_id, request_type, completed_at)
     values (tests.get_supabase_uid('user_a'), 'access', now()) $$,
  '42501',
  null,
  'A no puede definir completed_at al crear una privacy_request'
);

-- ============================================================================
-- BLOQUE 7 — versiones de política: lectura sí, escritura no
-- ============================================================================

-- 23. authenticated puede leer las versiones; no puede modificarlas.
select ok(
  (select count(*) from public.privacy_policy_versions) >= 1,
  'authenticated puede leer privacy_policy_versions'
);
select throws_ok(
  $$ update public.privacy_policy_versions set is_current = true $$,
  '42501',
  null,
  'authenticated no puede modificar privacy_policy_versions'
);

-- ============================================================================
-- 24. Solo una versión vigente por consent_type (índice único parcial).
--     Se prueba con identidad de servicio (cliente no puede escribir).
-- ============================================================================
select tests.clear_authentication();
select throws_ok(
  $$ insert into public.privacy_policy_versions (consent_type, version, is_current)
     values ('marketing', 'v2', true) $$,
  '23505',
  null,
  'No puede haber dos versiones vigentes del mismo consent_type'
);

-- ----------------------------------------------------------------------------
select * from finish();
rollback;
