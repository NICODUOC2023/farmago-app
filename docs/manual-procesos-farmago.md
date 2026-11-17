# Guía de procesos de farmaGO

**Tipo de documento:** guía funcional para usuarios y equipo de operación  
**Estado:** borrador basado en el comportamiento observado en el MVP  
**Ámbito:** aplicación farmaGO para búsqueda de medicamentos, farmacias, escaneo de recetas y seguimiento de tratamientos.

> Esta guía explica qué puede hacer una persona en la aplicación y qué esperar de cada proceso. No es un documento técnico ni reemplaza una indicación médica. El MVP no diagnostica, no recomienda tratamientos y no confirma por sí solo la disponibilidad física de un medicamento.

## 1. ¿Para qué sirve farmaGO?

farmaGO ayuda a buscar medicamentos en un catálogo, ubicar farmacias asociadas a una búsqueda y organizar tratamientos a partir de una receta escaneada. La pantalla principal presenta los resultados en un mapa.

La aplicación **no vende medicamentos**: no permite comprar, pagar, reservar ni solicitar despacho. La información del mapa debe usarse como orientación y conviene confirmarla directamente con la farmacia antes de desplazarse.

## 2. Procesos disponibles

| Proceso | Qué permite hacer | Consideración del MVP |
|---|---|---|
| Acceso a la aplicación | Crear cuenta, iniciar sesión y solicitar recuperación de contraseña | Se requiere una cuenta para utilizar las búsquedas. |
| Búsqueda de medicamento | Buscar por nombre, código de barras o descripción y elegir una coincidencia del catálogo | Que un producto aparezca en el catálogo no significa que tenga stock. |
| Búsqueda de farmacias | Usar la ubicación actual o elegir una comuna y ver farmacias en el mapa | La disponibilidad, los precios y la actualización del stock pueden no estar verificados o vigentes. |
| Escaneo de receta o caja | Tomar una foto o elegir una imagen, revisar los datos leídos y continuar | La lectura automática puede equivocarse; hay que contrastarla con la receta. |
| Seguimiento de tratamientos | Consultar tratamientos guardados, marcar tomas y eliminar un tratamiento | La edición completa y la sincronización entre dispositivos no están garantizadas. |
| Historial | Consultar búsquedas recientes y recetas incorporadas | Es un historial básico, no un registro clínico completo. |
| Privacidad | Exportar datos, revocar consentimientos o solicitar eliminación de cuenta | Los textos legales son provisionales y el cumplimiento debe revisarse antes de producción. |

## 3. Primer acceso y cuenta

1. En la pantalla de acceso, la persona puede **iniciar sesión** con su correo y contraseña o elegir **Crear cuenta**.
2. Al crear una cuenta, la aplicación solicita repetir la contraseña y comunica que enviará un correo para confirmar la cuenta.
3. Si olvidó la contraseña, debe ingresar su correo y usar **¿Olvidaste tu contraseña?** para recibir un enlace de recuperación.
4. En el primer acceso, se deben aceptar los términos de servicio y confirmar la lectura de la política de privacidad para continuar.
5. La opción para recibir comunicaciones de farmaGO es voluntaria y está separada de los consentimientos necesarios para usar el servicio.

Si el acceso falla, revisar el correo y la contraseña e intentar nuevamente. Para problemas de confirmación o recuperación, seguir las instrucciones recibidas por correo.

## 4. Buscar un medicamento y una farmacia

1. Desde el mapa principal, escribir al menos dos caracteres en el buscador.
2. Revisar las coincidencias del catálogo y seleccionar el medicamento correcto. La búsqueda puede usar nombre, código de barras o descripción.
3. La aplicación necesita un punto de referencia para calcular distancias:
   - **Ubicación actual:** se solicita permiso para usar el GPS durante esa búsqueda. La aplicación informa que no almacena permanentemente esa ubicación.
   - **Comuna:** si se rechaza el GPS o no está disponible, se puede elegir una comuna de la lista ofrecida. Las distancias desde una comuna son aproximadas.
4. La aplicación consulta las farmacias asociadas al medicamento y las muestra en el mapa. También se puede buscar farmacias cercanas sin seleccionar primero un medicamento.
5. Al seleccionar un marcador, la tarjeta de la farmacia puede mostrar nombre, dirección, horario/estado de apertura, distancia cuando se usó GPS y precio cuando corresponde.
6. Para cambiar el medicamento, quitar la selección actual y volver a buscar.

### Si no aparecen resultados o hay un error

- Si no hay coincidencias, probar con otra parte del nombre, una descripción o el código de barras.
- Si no hay farmacias registradas para la búsqueda, intentar de nuevo más tarde o consultar directamente con una farmacia.
- Si la ubicación falla, revisar los permisos del dispositivo o elegir una comuna.
- Si la consulta falla, usar **Reintentar**. La opción de abrir ajustes puede aparecer cuando el problema se relaciona con permisos de ubicación.

### Qué significa el resultado

El mapa sirve para orientar la búsqueda; no constituye una reserva ni una confirmación de stock. En esta versión no siempre se identifica claramente el origen de cada dato ni se presenta una advertencia confiable cuando el stock está desactualizado. Antes de ir, confirmar existencia, cantidad, precio y horario con la farmacia.

## 5. Escanear una receta o una caja

1. Abrir **Escanear receta** desde el botón central de la navegación.
2. Elegir **Tomar foto** o **Elegir de galería**. La imagen debe ser legible y mostrar la información completa.
3. La primera vez, la aplicación puede solicitar consentimiento para procesar la receta. También puede solicitar permiso para usar la cámara.
4. Revisar la imagen y elegir **Analizar con IA**. Si no se puede analizar, volver a intentar con una imagen más clara o tomar otra foto.
5. Revisar cuidadosamente cada dato detectado. La pantalla permite corregir nombre, dosis, frecuencia, duración y cantidad prescrita. También puede mostrar notas, profesional o institución si se reconocieron.
6. Contrastar todos los datos con la receta original antes de guardar o iniciar otra acción.

Si se reconoce una caja o un código de barras, la aplicación puede llevar directamente al mapa con el medicamento localizado en el catálogo, si hay una coincidencia.

### Límites del escaneo

- La lectura automática es una ayuda para transcribir información; puede omitir o interpretar mal datos manuscritos o poco visibles.
- No usar la lectura como diagnóstico, recomendación médica ni autorización para modificar la receta.
- La pantalla permite corregir los campos mostrados, pero no ofrece todas las acciones posibles de edición, como agregar libremente medicamentos o reorganizar toda la receta.
- Cuando el servicio de lectura no está configurado, la aplicación puede mostrar un resultado de demostración. Si aparece la indicación de modo demo, los datos no provienen de la receta fotografiada.
- La aplicación informa que la imagen se procesa temporalmente y que no se conserva permanentemente. El tratamiento puede involucrar proveedores externos; revisar la política de privacidad antes de usar recetas reales.

## 6. Buscar farmacias para una receta

Después de revisar los medicamentos detectados, se puede elegir **Buscar farmacias con esta receta**. Esta pantalla está disponible como demostración, pero actualmente presenta resultados de ejemplo: no se debe interpretar la cobertura, farmacia, distancia, precio, stock ni fecha mostrados como una consulta real verificada para esa receta y ubicación.

Por lo tanto, no usar esta pantalla para decidir dónde comprar. La búsqueda confiable de cobertura de todos los medicamentos de una receta queda pendiente de completar.

## 7. Guardar y seguir un tratamiento

1. En el resultado del escaneo, revisar los campos y elegir **Guardar en Tratamientos**.
2. Si todavía no se aceptó el consentimiento para tratar datos de salud, la aplicación lo solicitará antes de guardar.
3. Al confirmarse el guardado, se abre la sección **Tratamientos**.
4. Cada tratamiento reúne los medicamentos detectados y los datos disponibles, como dosis, frecuencia, duración y notas.
5. Usar los círculos de cada medicamento para marcar tomas como realizadas o volver a dejarlas pendientes. El progreso es un registro introducido por la persona; no verifica que el medicamento se haya tomado.
6. El botón de búsqueda junto a un medicamento permite volver al mapa y buscar ese producto.
7. Para eliminar un tratamiento, usar el ícono de eliminar y confirmar la acción.

### Recordatorios y conservación

En algunas configuraciones, al guardar un tratamiento la aplicación puede solicitar permiso para enviar notificaciones y programar recordatorios. Los horarios no se configuran desde la pantalla de tratamiento; si no se conceden permisos o el servicio no está disponible, no se deben esperar avisos.

Los tratamientos se conservan en la aplicación y pueden enviarse a la cuenta si la configuración del servicio lo permite. La sincronización entre dispositivos y el respaldo de todos los cambios —incluidas las tomas marcadas— no están garantizados en esta versión. No utilizar la aplicación como único registro de un tratamiento.

## 8. Consultar el historial

La sección **Historial** puede mostrar selecciones recientes del buscador y entradas de recetas escaneadas. Las búsquedas recientes se guardan localmente en el dispositivo y se limpian al cerrar sesión. El historial no equivale a una ficha clínica ni necesariamente incluye todas las acciones realizadas.

## 9. Privacidad y datos personales

La aplicación puede tratar el correo de la cuenta, búsquedas, datos de medicamentos y tratamientos, información extraída de recetas y la ubicación temporal necesaria para calcular distancias. La ubicación se solicita para la búsqueda y no se declara como almacenamiento permanente.

En la sección **Privacidad y datos**, si está habilitada, la persona puede:

- **Exportar mis datos:** solicitar una copia de los datos asociados a su cuenta.
- **Revocar consentimientos:** retirar los permisos previamente otorgados. Revocarlos puede impedir nuevos procesos que dependan de ellos; no equivale a borrar los datos existentes.
- **Solicitar eliminación de cuenta:** iniciar la solicitud de eliminación. La solicitud puede requerir procesamiento posterior y la pantalla no promete un borrado instantáneo.

Los términos y la política de privacidad que aparecen en la versión actual se identifican como provisionales y requieren revisión legal antes de una publicación de producción.

## 10. Qué no ofrece el MVP

- Compra, pago, reserva, despacho o carrito.
- Diagnóstico, recomendación médica o sustitución automática de medicamentos.
- Confirmación garantizada del stock físico, su vigencia o la equivalencia entre productos.
- Cobertura en vivo y confiable de todos los medicamentos de una receta.
- Edición completa de tratamientos, gestión clínica o sincronización garantizada entre dispositivos.
- Un control para configurar manualmente los horarios de recordatorios.

## 11. Recomendaciones de uso

1. Confirmar con la farmacia el stock, precio y horario antes de desplazarse.
2. Revisar cada medicamento y cada dosis reconocidos por el escaneo contra la receta original.
3. Seguir las indicaciones del profesional de salud; farmaGO no sustituye esas indicaciones.
4. No considerar una pantalla de demostración como información comercial real.
5. Conservar por separado la receta y el registro oficial de tratamientos.

## 12. Pendientes para una versión de producción

- Completar la búsqueda real de cobertura para recetas y distinguir resultados confirmados de demostraciones.
- Mostrar de forma clara la fuente, la fecha de actualización y el estado de vigencia del stock.
- Completar las opciones de edición y gestión de tratamientos, incluida su sincronización.
- Revisar y finalizar los textos legales y los procesos de privacidad.
- Validar la información de farmacias y medicamentos antes de presentarla como disponible al público.

---

**Nota de mantenimiento:** actualizar esta guía cuando cambien los procesos visibles de acceso, búsqueda, escaneo, tratamientos, historial o privacidad. Mantener explícita la diferencia entre funciones activas, demostrativas y pendientes.
