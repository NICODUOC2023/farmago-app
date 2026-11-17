# Gobernanza de datos — farmaGO

**Versión:** 1.0 (borrador para revisión jurídica y técnica)
**Alcance:** MVP farmaGO (Santiago de Chile).
**Advertencia:** Este documento no constituye asesoría legal definitiva. Debe ser revisado por un profesional jurídico antes de producción.

---

## 1. Categorías de datos tratados

- Correo electrónico (autenticación).
- Historial de búsquedas (medicamentos seleccionados).
- Ubicación temporal (coordenadas GPS o comuna seleccionada, no persistida).
- Medicamentos, dosis, frecuencia, duración, cantidad.
- Tratamientos y tomas.
- Datos derivados de OCR (estructurados, sin imagen ni OCR crudo).
- Consentimientos y solicitudes de privacidad.
- Datos demostrativos/sintéticos (farmacias y stock).

## 2. Finalidades

- Autenticar usuarios.
- Buscar medicamentos y farmacias con stock.
- Procesar recetas mediante OCR para identificar medicamentos.
- Guardar y gestionar tratamientos.
- Calcular distancias y ordenar resultados.
- Cumplir obligaciones legales y atender derechos del usuario.

## 3. Base y consentimiento

- Términos de servicio y política de privacidad: obligatorios para usar la app.
- Procesamiento de recetas (`prescription_processing`): antes de escanear.
- Datos de salud (`health_data_processing`): antes de guardar tratamiento.
- Geolocalización (`geolocation_processing`): antes de usar GPS.
- Marketing: opcional, separado, desmarcado por defecto.

## 4. Proveedores externos

- **Supabase:** autenticación, base de datos, RLS, Edge Functions. Recibe datos de cuenta y salud según RLS. Ubicación no persistida.
- **Google (Gemini):** OCR de recetas. Recibe imagen temporalmente. No se almacena imagen ni OCR crudo.
- **Google Maps (Android):** visualización de mapa. Puede recibir coordenadas para renderizar.
- **Apple Maps (iOS):** visualización de mapa. Puede recibir coordenadas para renderizar.
- **Lioren:** catálogo de productos. No recibe datos de salud ni ubicación del usuario.
- **Farmex (demo):** datos sintéticos. No recibe datos del usuario.

Transferencia internacional: proveedores pueden procesar datos fuera de Chile; revisar bases legales antes de producción.

## 5. Retención

- Ubicación: solo durante la consulta actual (no persistida).
- Imágenes de recetas: no se almacenan.
- OCR crudo: no se almacena (solo metadatos estructurados).
- Tratamientos: mientras la cuenta exista o hasta eliminación.
- Búsquedas recientes: se mantienen localmente en el dispositivo, no se sincronizan entre dispositivos, se eliminan al cerrar sesión o desde configuración. La persistencia remota queda fuera del MVP.
- Consentimientos: historial append-only.
- Stock: fotografía con vigencia de 12 horas.

## 6. Almacenamiento

- Base de datos PostgreSQL con RLS por usuario.
- No se almacena ubicación del usuario.
- Datos demo/sintéticos claramente identificados (sin etiqueta de origen en UI por decisión de producto).

## 7. Derechos del usuario

- Acceso, rectificación, eliminación, portabilidad, oposición.
- Revocación de consentimientos.
- Exportación de datos (`export_my_data`).
- Solicitud de eliminación (`request_account_deletion`).

## 8. Procedimientos

- **Revocación:** `revoke_consent` / `revoke_all_consents`. Bloquea nuevos guardados dependientes, pero permite consultar/eliminar datos propios.
- **Exportación:** `export_my_data` (JSON).
- **Eliminación:** `request_account_deletion` crea solicitud; borrado definitivo server-side con service_role (no desde cliente).

## 9. Datos que nunca deben aparecer en logs

- Imágenes de recetas.
- OCR completo.
- Nombres de medicamentos vinculados a un usuario.
- Dosis, diagnósticos.
- Coordenadas.
- Correos completos.
- Tokens, claves API.
- Respuestas completas de Gemini.
- Errores con datos personales.

## 10. Limitaciones del MVP

- Consentimientos implementados a nivel de BD y servicio; consumo en app parcial.
- Geolocalización consentida en BD, UI pendiente.
- Marketing opcional.
- Revisión jurídica pendiente.

## 11. Advertencia legal

Este documento es un borrador técnico. Debe ser revisado por un profesional jurídico antes de producción. farmaGO no se presenta como jurídicamente certificado.
