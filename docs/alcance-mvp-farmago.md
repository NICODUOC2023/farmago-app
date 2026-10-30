# Alcance del MVP — farmaGO

**Versión:** 1.0 (borrador para revisión académica)
**Proyecto:** farmaGO — aplicación móvil para encontrar medicamentos en farmacias
**Ámbito inicial:** Santiago de Chile
**Estado del documento:** generado a partir de una auditoría del código, rutas, servicios, migraciones y funciones de Supabase. No se modificó código, base de datos ni despliegues durante su elaboración.

---

## 1. Descripción general

farmaGO es una aplicación móvil desarrollada con React Native, Expo y TypeScript, con backend en Supabase (PostgreSQL/PostGIS). Su objetivo es ayudar a los usuarios a encontrar medicamentos disponibles en farmacias, combinando búsqueda individual por texto, escaneo de recetas mediante OCR (proveedor de inteligencia artificial) y visualización geográfica de farmacias con stock.

El MVP se centra en dos flujos principales: (a) búsqueda individual de un medicamento con mapa de farmacias cercanas con stock, y (b) escaneo de una receta, revisión/edición de los medicamentos detectados, guardado del tratamiento y conexión con la búsqueda de farmacias. La aplicación requiere inicio de sesión para su uso.

El sistema contempla, a nivel de base de datos, una arquitectura de privacidad robusta (RLS, consentimientos versionados, exportación y eliminación de cuenta), aunque su consumo desde la aplicación está parcialmente implementado.

---

## 2. Problema

Los usuarios tienen dificultades para saber qué farmacias tienen disponible un medicamento específico, especialmente en farmacias independientes. Las búsquedas suelen ser manuales, por teléfono o presenciales, y las recetas médicas con varios medicamentos complican aún más la localización de stock. Además, la información de disponibilidad cambia con el tiempo y no siempre es confiable.

farmaGO busca reducir esa fricción ofreciendo una búsqueda centralizada, georreferenciada y actualizada, con soporte para recetas multimedimento, sin realizar compra, pago ni reserva en esta etapa.

---

## 3. Usuarios objetivo

- Personas mayores de 18 años que necesitan localizar medicamentos en farmacias cercanas.
- Pacientes con tratamientos crónicos o agudos que desean seguir la toma de medicamentos.
- Usuarios que reciben recetas médicas con varios medicamentos y quieren verificar disponibilidad.
- Usuario único declarado como responsable del desarrollo actual: **NG**. MZ y EE sin asignación específica en esta iteración (pendiente).

---

## 4. Objetivo general

Desarrollar un MVP móvil que permita a los usuarios autenticados buscar medicamentos y farmacias con stock cercano, escanear recetas mediante OCR, gestionar tratamientos y visualizar resultados en un mapa, utilizando datos reales, demostrativos y sintéticos claramente acotados, sin realizar transacciones comerciales.

---

## 5. Objetivos específicos

1. Permitir la búsqueda individual de medicamentos por nombre y, cuando esté disponible, por principio activo.
2. Mostrar farmacias cercanas con stock para el medicamento buscado, ordenadas por cercanía y disponibilidad.
3. Permitir el escaneo de recetas con OCR, la revisión/edición de los datos detectados y el guardado del tratamiento.
4. Conectar el resultado del OCR con la búsqueda de farmacias (cobertura completa o parcial).
5. Gestionar tratamientos (crear, modificar, eliminar, marcar tomas).
6. Aplicar reglas de stock (vigencia máxima de 12 horas) y advertencias de desactualización.
7. Implementar reglas de mapa y ubicación (GPS o comuna) sin persistir la ubicación del usuario.
8. Mantener una arquitectura de privacidad y datos personales alineada con la Ley 21.719, declarando controles implementados y pendientes.
9. Trabajar con al menos 20 farmacias independientes activas, georreferenciadas y con información válida (requisito del MVP, actualmente no alcanzado).

---

## 6. Alcance incluido

### 6.1 Funcionalidades implementadas

- **Autenticación por correo/contraseña** con Supabase (UI mínima de login en el mapa). `[Implementado]`
- **Búsqueda individual de medicamentos** por nombre/código de barras/descripción contra la tabla `medications`. Mínimo 2 caracteres, hasta 20 resultados. `[Implementado]`
- **Búsqueda de farmacias cercanas** vía RPC `nearby_pharmacies`, radio 5 km, filtro opcional por medicamento, usando GPS. `[Implementado]`
- **Mapa** con `react-native-maps`, marcadores y farmacia seleccionada. `[Implementado]`
- **Escaneo OCR** con Gemini (o resultado mock si no hay API key), extrayendo nombre, dosis, frecuencia, duración, notas, médico e institución. `[Implementado]` (parcial respecto al alcance deseado)
- **Tratamientos en memoria** (Zustand) con datos mock iniciales + escaneados; marcado de tomas. `[Implementado]` (sin persistencia)
- **Esquema de base de datos** con RLS, consentimientos versionados, exportación y solicitud de eliminación. `[Implementado a nivel de BD]`

### 6.2 Funcionalidades parcialmente implementadas

- **Autenticación:** existen servicios `signUp`/`resetPassword`, pero sin UI. `[Parcial]`
- **OCR:** no extrae principio activo, concentración, presentación, cantidad de cajas ni confianza; no permite edición; no se conecta con farmacias. `[Parcial]`
- **Tratamientos:** sin persistencia en Supabase; eliminación implementada, modificación parcial. `[Parcial]`
- **Privacidad:** la BD soporta consentimientos, exportación y eliminación, pero la app no los consume. `[Parcial]`
- **Mapa:** sin selección de comuna/dirección, sin ampliación a 10 km, sin colores semánticos por recomendación. `[Parcial]`

### 6.3 Funcionalidades planificadas

- Flujo completo de búsqueda por receta (cobertura completa/parcial). `[Planificado]`
- Selección de región + comuna con centro referencial en la municipalidad. `[Planificado]`
- Ampliación de radio hasta 10 km. `[Planificado]`
- Advertencia de stock desactualizado (>12 h). `[Planificado]`
- Alcanzar 20 farmacias independientes (scraping/carga). `[Planificado]`
- Carga manual de Farmex (50 productos + stock sintético). `[Planificado]`
- (Eliminado) No existe paywall ni funciones premium en este MVP.
- Edición OCR (nombre, dosis, frecuencia, duración, cantidad). `[Planificado]`
- Modificación y eliminación de tratamientos. `[Planificado]`
- Persistencia de tratamientos en Supabase. `[Planificado]`

---

## 7. Funcionalidades fuera del alcance

- Compra, pago, reserva, despacho.
- Carrito.
- Combinación automática de varias farmacias.
- Creación de pedidos.
- Diagnóstico médico.
- Recomendación médica.
- Sustitución automática de medicamentos.
- No se proponen funcionalidades futuras adicionales en esta iteración; cualquier extensión queda fuera del alcance actual.

---

## 8. Flujo de búsqueda individual

1. El usuario inicia sesión (obligatorio para buscar).
2. Ingresa un término en la barra de búsqueda (mínimo 2 caracteres).
3. El sistema busca medicamentos por nombre parcial y, cuando esté disponible, por principio activo.
4. El usuario selecciona un medicamento del listado (máximo 20 resultados).
5. La app obtiene la ubicación (GPS) o, si se rechaza, solicita región + comuna.
6. Se consulta `nearby_pharmacies` con radio inicial de 5 km y el medicamento seleccionado.
7. Se muestran hasta 5 farmacias por medicamento con stock, ordenadas por cercanía y disponibilidad.
8. Al seleccionar una farmacia, se muestra su detalle (nombre, dirección, distancia, stock/cantidad, precio, fecha de última actualización) y se centra en el mapa.
9. Si no hay resultados, se permite ampliar el radio hasta 10 km.

---

## 9. Flujo de búsqueda mediante OCR

1. El usuario captura o selecciona una imagen de la receta (cámara o galería).
2. La app envía la imagen al proveedor de OCR (Gemini) o usa resultado mock si no hay API key.
3. El OCR intenta extraer: nombre del medicamento, principio activo (si aparece), concentración, presentación, dosis, frecuencia, duración, cantidad prescrita, médico e institución.
4. Se muestra un aviso genérico para revisar los datos.
5. El usuario puede editar: nombre, dosis, frecuencia, duración y cantidad. No se pueden agregar medicamentos manualmente.
6. Medicamentos no reconocidos se agregan igual; en la búsqueda se informa que no está en el catálogo.
7. Duplicados se mantienen separados.
8. El usuario confirma explícitamente.
9. Se guarda el tratamiento (en memoria en el MVP actual; persistencia planificada).
10. Se conecta con la búsqueda de farmacias (cobertura completa o parcial).

---

## 10. Flujo de resultados con cobertura completa

> Estado: **planificado** (no implementado en el código actual).

1. El usuario confirma los medicamentos de la receta.
2. El sistema busca una farmacia que tenga todos los medicamentos de la receta.
3. Si existe, se muestra como farmacia recomendada (azul) y las demás con stock en gris.
4. Se muestra detalle de la farmacia, distancias y stock.

---

## 11. Flujo de resultados parciales

> Estado: **planificado** (no implementado en el código actual).

1. Si ninguna farmacia tiene todos los medicamentos:
   - No se crean combinaciones automáticas.
   - No se crea un pedido.
   - Se muestra un listado agrupado por medicamento.
   - Se indica qué farmacias tienen stock para cada producto (máximo 5 por medicamento).
   - Al presionar un resultado, se muestra en el mapa.
   - Se indica claramente qué medicamentos faltan.

---

## 12. Reglas de mapa, ubicación y colores

- Si el usuario autoriza GPS: el mapa se centra en su ubicación; la farmacia recomendada (más cercana con stock) se destaca; las demás con stock aparecen en gris. `[Planificado para colores semánticos]`
- Búsqueda inicial con radio de 5 km; si no hay resultados, se permite ampliar hasta 10 km. `[Parcial: solo 5 km implementado]`
- Si se rechaza GPS: se selecciona región + comuna; el mapa se centra en un punto referencial administrativo de la comuna (municipalidad o centro cívico). `[Planificado]`
- La ubicación se usa solo para la consulta actual y no se almacena permanentemente. `[Implementado: GPS efímero]`
- Si se selecciona comuna: se informa "Distancias aproximadas desde el centro de la comuna seleccionada." `[Planificado]`
- Sin GPS, comuna ni dirección: no se afirma cuál es la farmacia más cercana; no se destaca arbitrariamente una farmacia en azul; las farmacias pueden mostrarse en gris o el usuario debe seleccionar una ubicación. `[Parcial]`
- El color de destaque significa "farmacia recomendada para esta búsqueda", no necesariamente "ubicación exacta del usuario". `[Planificado]`
- Implementación actual de marcadores: el elemento activo (seleccionado) usa color primario; el resto color secundario. `[Implementado]`

---

## 13. Reglas de stock y actualización

- El stock se entiende como una fotografía de disponibilidad obtenida desde una fuente externa. `[Implementado como concepto]`
- Un stock se considera vigente durante un máximo de 12 horas. `[Planificado en UI]`
- Si supera las 12 horas: no se muestra como stock confirmado; aparece como desactualizado o no disponible; la interfaz informa la fecha de última actualización. `[Planificado]`
- La regla de 12 h aplica a todo stock (real y demo). `[Acordado]`
- No se inventa disponibilidad real sin marcarla como demostrativa. `[Acordado]`
- Los datos de Farmex deben mostrarse como “Datos demostrativos” en la UI. `[Acordado]`
- Stock sintético (demo/Farmex) se utiliza para demostrar el funcionamiento del MVP y no representa stock físico real. `[Acordado]`

---

## 14. Arquitectura general

- **Frontend:** React Native + Expo + TypeScript, expo-router, NativeWind, Zustand.
- **Backend:** Supabase (PostgreSQL + PostGIS), RLS, RPCs, Edge Functions.
- **Mapas:** react-native-maps (Google en Android, Apple en iOS); Mapbox opcional.
- **Ubicación:** expo-location, solo en primer plano y efímera.
- **OCR:** Edge Function `ocr-prescription` implementada en código; su despliegue y secret remoto están pendientes de verificación. La clave no se expone en el cliente.
- **Integraciones:** Lioren (Edge Function `sync-lioren`), Farmex (carga manual planificada).
- **Base de datos:** esquema con 18 tablas, enums, triggers, RLS, funciones de consentimiento y RPCs. El estado remoto no pudo verificarse (NXDOMAIN, falta de privilegios CLI y ausencia de SUPABASE_DB_PASSWORD). No se afirma que las migraciones existan o no en remoto.

---

## 15. Fuentes de datos

- **Lioren:** entregó catálogo de productos y farmacia manual. No entregó sucursales ni stock. No debe describirse como stock real. `[Real parcial: catálogo]`
- **Farmex:** fuente de demostración. Se cargará manualmente con 50 productos del catálogo público, precios publicados y stock sintético determinista (1-20). Mantenida por el usuario. `[Demo/sintético, planificado]`
- **Demo:** 5 farmacias de Santiago + 5 medicamentos demo con stock sintético. `[Demo/sintético]`
- **Manual:** farmacia "Sucursal Antonio Varas" (Lioren) con ubicación fija. `[Real/Manual]`
- Lioren, Farmex y demo son farmacias distintas; los duplicados se diferencian por fuente/farmacia. `[Acordado]`
- No se distinguen las fuentes en la UI. `[Acordado]`
- No se afirma la existencia de 20 farmacias conectadas: actualmente ~7. `[Estado real]`

---

## 16. Tratamiento de datos personales

- La app puede tratar: correo, historial de búsquedas, ubicación temporal, medicamentos, dosis, duración, horarios, tratamientos y datos derivados del OCR.
- No se almacenan imágenes de recetas ni OCR crudo (solo metadatos estructurados). `[Diseño de BD]`
- Controles implementados a nivel de BD: autenticación, RLS por usuario, consentimientos versionados, exportación de datos, solicitud de eliminación de cuenta, ubicación temporal (no persistida). `[Implementado en BD]`
- Controles pendientes en la app: consumo de consentimientos, exportación, eliminación, validación de mayoría de edad, mover OCR a Edge Function. `[Pendiente]`
- Relación con Ley 21.719: se alinean principios de minimización, finalidad, seguridad y derechos ARCO, pero el proyecto no se presenta como jurídicamente certificado. `[Declaración]`
- Proveedores externos (Supabase, Google/Gemini, Lioren) pueden actuar como encargados; revisar transferencia internacional de datos antes de producción. `[Riesgo]`

---

## 17. Requisitos funcionales

- RF-01: El usuario debe iniciar sesión para usar la aplicación. `[Implementado]`
- RF-02: Búsqueda individual por nombre y principio activo (cuando esté disponible). `[Implementado parcial]`
- RF-03: Mostrar hasta 5 farmacias por medicamento con stock, ordenadas por cercanía y disponibilidad. `[Parcial]`
- RF-04: Escaneo OCR de recetas con extracción de campos y edición manual (nombre, dosis, frecuencia, duración, cantidad). `[Parcial/Planificado]`
- RF-05: Confirmación explícita antes de guardar un tratamiento. `[Planificado]`
- RF-06: Guardado, modificación y eliminación de tratamientos. `[Parcial/Planificado]`
- RF-07: Marcado de tomas en tratamientos. `[Implementado]`
- RF-08: Búsqueda de farmacias por receta (cobertura completa/parcial). `[Planificado]`
- RF-09: Regla de 12 h para stock con advertencia de desactualización. `[Planificado]`
- RF-10: Selección de comuna/región sin GPS, con centro referencial municipal. `[Planificado]`
- RF-11: Ampliación de radio de 5 km a 10 km sin resultados. `[Planificado]`
- RF-12: (Eliminado) No existe paywall ni funciones premium en este MVP.
- RF-13: Medicamentos no reconocidos se agregan y se informa que no están en el catálogo. `[Planificado]`
- RF-14: Duplicados se mantienen separados. `[Planificado]`

---

## 18. Requisitos no funcionales

- RNF-01: La ubicación del usuario no se persiste. `[Implementado]`
- RNF-02: El stock no se presenta como físico real si es demo/sintético. `[Acordado]`
- RNF-03: RLS en todas las tablas de datos personales/salud. `[Implementado en BD]`
- RNF-04: Sin SQL dinámico en funciones; SECURITY DEFINER con search_path controlado. `[Implementado en BD]`
- RNF-05: La service_role key no se expone en el cliente. `[Implementado]`
- RNF-06: Migraciones no ejecutadas automáticamente; aplicación manual. `[Estado]`
- RNF-07: Rendimiento básico: búsqueda con límite de resultados y radio acotado. `[Implementado]`
- RNF-08: Compatibilidad Expo Go (Android/iOS) para mapa con proveedor Google/Apple. `[Implementado]`

---

## 19. Criterios de aceptación

- CA-01: Un usuario autenticado puede buscar un medicamento y ver farmacias cercanas con stock en el mapa. `[Implementado]`
- CA-02: El usuario puede escanear una receta, revisar/editar los datos y guardar un tratamiento. `[Parcial: edición pendiente]`
- CA-03: Los tratamientos permiten marcar tomas. `[Implementado]`
- CA-04: El stock desactualizado se muestra con advertencia y fecha. `[Planificado]`
- CA-05: Sin GPS, se puede seleccionar comuna y ver distancias aproximadas. `[Planificado]`
- CA-06: Si no hay resultados, se permite ampliar a 10 km. `[Planificado]`
- CA-07: Se distingue claramente el stock demo/sintético (mediante mensaje general, no por origen). `[Acordado]`
- CA-08: La migración de BD se puede aplicar en un entorno de desarrollo sin errores (validación estática realizada; ejecución pendiente). `[Pendiente]`

---

## 20. Métricas del MVP

No se definieron métricas cuantitativas en esta iteración. Se reportará evidencia cualitativa:
- Demo en vivo de los flujos de búsqueda por input y OCR.
- Capturas de pantalla.
- Validaciones estáticas (TypeScript, ESLint, pglast).

---

## 21. Riesgos y limitaciones

- El flujo de receta completo (cobertura) no está implementado.
- No se alcanzan las 20 farmacias independientes (solo ~7).
- Paywall/premium no aplica: fuera del alcance del MVP.
- La privacidad está robusta en BD, pero la app no consume consentimientos/exportación/eliminación.
- La Edge Function OCR está implementada en código; su despliegue y secret remoto están pendientes de verificación.
- El stock de Lioren no está sincronizado (vacío); no hay stock físico real verificado.
- Los tratamientos no se persisten (solo memoria).
- La migración de BD no fue ejecutada; solo validada estáticamente.
- No se etiqueta el origen de los datos en la UI (decisión acordada).
- El OCR no extrae todos los campos deseados ni permite edición en el estado actual.

---

## 22. Trabajo futuro

No se proponen funcionalidades futuras en esta iteración. El alcance se limita al MVP documentado. Cualquier extensión (compra, pago, carrito, combinación automática, diagnóstico, sustitución, scraping automático, persistencia completa, etc.) queda fuera del alcance actual y deberá definirse en una nueva iteración.

---

## 23. Distribución de responsabilidades

- **NG:** asume todo el desarrollo actual del MVP.
- **MZ:** sin asignación específica en esta iteración (pendiente).
- **EE:** sin asignación específica en esta iteración (pendiente).

---

## 24. Decisiones pendientes

1. Implementar el flujo de receta completo (cobertura completa/parcial).
2. Alcanzar las 20 farmacias independientes (scraping/carga).
3. (Eliminado) No se implementa paywall/premium.
4. Conectar la app con consentimientos, exportación y eliminación de datos.
5. Mover la llamada a Gemini a una Edge Function.
6. Definir y ejecutar la migración de BD en un entorno de desarrollo.
7. Implementar edición OCR y gestión completa de tratamientos (modificar/eliminar).
8. Implementar persistencia de tratamientos en Supabase.
9. Definir métricas cuantitativas para futuras iteraciones.
10. Precisar la equivalencia entre productos (principio activo + concentración + forma + presentación).

---

*Fin del documento.*
