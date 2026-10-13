# Fase 2B — Checklist de migración inicial (farmaGO)

Estado: **NO EJECUTADA**. Este documento describe cómo probar y aplicar la
migración; no se aplicó a ningún proyecto Supabase (ni local ni remoto).

## Archivos

| Archivo | Rol | Estado |
|---|---|---|
| `supabase/migrations/20261012183000_initial_schema.sql` | Migración ejecutable (copia del borrador aprobado, sin `BEGIN/COMMIT`) | Creada, **sin ejecutar** |
| `supabase/drafts/phase2a_schema.sql` | Borrador aprobado (fuente de verdad) | Intacto |
| `supabase/drafts/phase2a_rls_tests.sql` | Pruebas RLS (pgtap), no ejecutadas | Intacto |

La migración es **equivalente** al borrador aprobado salvo por la **eliminación
de los wrappers transaccionales explícitos** (`begin;` / `commit;`), que ahora
administra el Supabase CLI. Esa es la única diferencia textual: el resto del
contenido es idéntico.

## 1. Dependencias de ejecución

- **PostgreSQL 17** (`supabase/config.toml` → `major_version = 17`).
- Esquema y roles de **Supabase Auth**:
  - `auth.users` (FK de `profiles`, `prescriptions`, `treatments`,
    `favorite_*`, `recent_searches`, `privacy_consents`, `privacy_requests`).
  - Roles `anon`, `authenticated`, `service_role`.
  - Función `auth.uid()` (usada en RLS y en funciones).
- Orden de creación respetado internamente: las FKs a `auth.users` requieren que
  la tabla exista; por eso la migración debe correr **después** de inicializar
  Auth en el proyecto.
- `gen_random_uuid()` es nativo de PostgreSQL ≥ 13 (no requiere `pgcrypto`).

## 2. Extensiones requeridas

Declaradas al inicio de la migración (`create extension if not exists`):

| Extensión | Uso |
|---|---|
| `postgis` | `geography(Point,4326)`, `ST_DWithin`, `ST_Distance` (farmacias cercanas) |
| `pg_trgm` | índices GIN de similitud en nombres (`gin_trgm_ops`) |
| `unaccent` | normalización de texto |

Notas:
- En Supabase, `postgis`, `pg_trgm` y `unaccent` están disponibles y suelen
  requerir habilitarse en la base. `create extension if not exists` es
  idempotente.
- Verificar que la extensión `postgis` esté disponible para el rol que ejecuta
  las migraciones (en Supabase lo está).

## 3. Orden de migración

La migración contiene el esquema completo en un orden ejecutable desde cero. El
orden conceptual solicitado y su ubicación real:

| Fase solicitada | Ubicación en el archivo |
|---|---|
| Extensiones | §0 |
| Enums | §1 |
| Tablas | §3–§20 |
| Índices | inline, junto a cada tabla |
| Triggers | inline, junto a cada tabla (§3–§17), §21 |
| Seed de `privacy_policy_versions` | §18 |
| Funciones | §2 (`set_updated_at`), §17 (`trim_recent_searches`), §21–§22 |
| RLS | §23 (con grants/revokes por tabla inline) |
| Grants y revokes | inline en §23 + §25 (funciones) |
| RPCs | §24 |

Desviaciones respecto de la lista literal (todas **por dependencia**, sin cambio
de comportamiento):

- `set_updated_at()`, `trim_recent_searches()`, `handle_new_user()` y
  `sync_profile_email()` deben existir **antes** de sus triggers ⇒ aparecen
  antes/junto a las tablas, no después.
- Las RPCs (§24) aparecen antes del bloque central de `revoke/grant` de
  funciones (§25) porque las sentencias de §25 referencian las firmas de esas
  RPCs (`nearby_pharmacies`, `export_my_data`, etc.). Los grants/revokes de
  tablas sí van inline con la RLS (§23).
- El seed (§18) va antes de las funciones de consentimiento para que
  `grant_consent()` pueda validar la versión vigente.

Cada sentencia usa `create ... if not exists` / `create or replace` donde
corresponde; las tablas y tipos no son idempotentes por diseño (una migración
corre una sola vez).

## 4. Variables / configuración necesaria

- No usa variables de entorno en SQL.
- `supabase/config.toml`: `project_id = "farmago-app"`, `major_version = 17`.
- Para pruebas locales, Auth debe estar activo (los triggers de `auth.users`
  dependen de la tabla). `supabase start` provee `auth` y los roles.
- No requiere claves de API ni secretos para ejecutarse.

## 5. Riesgos conocidos

1. **Transacción explícita (`begin;` … `commit;`) — RESUELTO.** Se eliminaron el
   `begin;` inicial y el `commit;` final del archivo de migración, de modo que la
   transacción la administra el Supabase CLI (evita los *warnings* `there is
   already a transaction in progress` / `there is no transaction in progress` y
   preserva la atomicidad que provee el runner). La versión del borrador
   (`supabase/drafts/phase2a_schema.sql`) conserva sus wrappers; la migración no.
2. **Privilegios por defecto de Supabase.** Supabase otorga privilegios por
   defecto a `anon`/`authenticated`/`service_role` en el esquema `public`. La
   migración **no** revoca el `SELECT` implícito de `anon` sobre las tablas de
   catálogo; el acceso de `anon` queda bloqueado por **RLS** (no hay ninguna
   policy para `anon`). Endurecimiento opcional: `revoke select ... from anon`
   en el catálogo.
3. **`privacy_policy_versions` con `on delete restrict`** desde
   `privacy_consents`: no se puede borrar una versión con consentimientos
   asociados. Es intencional.
4. **Re-consentimiento al publicar versión.** `has_active_consent()` valida
   contra la versión **vigente** (`is_current`). Al publicar `v2` de un tipo, los
   consentimientos activos `v1` dejan de gatear hasta que el usuario re-consienta.
   Comportamiento intencional, pero implica migración de consentimientos al
   usuario.
5. **`postgis`/`pg_trgm`/`unaccent`** deben estar disponibles en el proyecto
   destino. Si el plan no habilita PostGIS, fallarán la columna `geography` y los
   índices `gist`.
6. **`auth.users` debe existir** antes de aplicar (Auth habilitado). Sin él, las
   FKs y los triggers fallan.
7. **`profiles.email` es `NOT NULL`.** Si se habilitara un proveedor de Auth sin
   email (p. ej. teléfono), el trigger `handle_new_user` insertaría `''`. No
   rompe, pero conviene revisar antes de producción.

## 6. Cómo probarla en un proyecto Supabase de desarrollo

> Ejecutar solo contra un proyecto/entorno **de desarrollo**. Nunca contra
> producción. Estos comandos **no** se ejecutaron en esta fase.

Opción A — local (Docker requerido):

```bash
supabase start                 # levanta Postgres 17 + Auth + PostGIS locales
supabase db reset              # aplica migrations/ desde cero (incluye 20261012183000_initial_schema.sql)
supabase test db               # (opcional) ejecuta las pruebas RLS de drafts/
```

Opción B — proyecto de desarrollo remoto (con `supabase link` a un proyecto DEV):

```bash
supabase link --project-ref <DEV_PROJECT_REF>
supabase db push               # aplica 20261012183000_initial_schema.sql en DEV
supabase migration list        # verifica que la migración figure como aplicada
```

Verificación manual sugerida tras aplicar (en un entorno DEV):

```sql
-- 1. tablas/enums/funciones creados
select count(*) from information_schema.tables where table_schema='public';   -- 18
select count(*) from pg_type where typnamespace='public'::regnamespace and typtype='e'; -- 9
-- 2. RLS habilitada en las 18 tablas
select count(*) from pg_tables where schemaname='public' and rowsecurity;     -- 18
-- 3. versiones vigentes seed
select consent_type, version from public.privacy_policy_versions where is_current;
-- 4. grants por columna en privacy_requests
select column_name, privilege_type from information_schema.column_privileges
 where table_name='privacy_requests' and grantee='authenticated';
```

## 7. Confirmación

- **La migración NO fue ejecutada.** No se corrió `supabase db push`,
  `supabase db reset`, `supabase start`, `supabase link`, SQL Editor remoto, ni
  migración contra producción.
- **No se tocó ningún proyecto Supabase remoto.** `supabase/.temp/` solo contiene
  `cli-latest` (sin `project-ref`), evidencia de que no hay proyecto vinculado.
- **No se crearon Edge Functions** en esta fase.
- `supabase/drafts/phase2a_schema.sql` y `supabase/drafts/phase2a_rls_tests.sql`
  permanecen intactos.

## 8. Validaciones realizadas (estáticas)

| Validación | Resultado |
|---|---|
| `pglast` — `20261012183000_initial_schema.sql` | OK, 175 sentencias |
| `pglast` — `phase2a_schema.sql` | OK, 175 sentencias |
| `pglast` — `phase2a_rls_tests.sql` | OK, 53 sentencias |
| `tsc --noEmit` | exit 0 |
| `expo lint` | exit 0 |
| `diff` draft vs migración | Solo difieren en la eliminación de `begin;`/`commit;` (equivale fuera de los wrappers) |
| `grep '^(begin\|commit);'` en la migración | 0 coincidencias (sin transacción explícita) |

> Importante: estas validaciones son **sintácticas/estáticas**. La migración **no**
> fue probada semánticamente contra una instancia real de PostgreSQL porque no se
> ejecutó.
