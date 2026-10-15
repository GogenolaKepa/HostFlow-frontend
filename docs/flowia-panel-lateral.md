# FlowIA — drawer modal integrado en la navegación de HostFlow

## Alcance de esta entrega

FlowIA se abre desde el último acceso de la navegación principal, con los mismos estilos del menú y sin un divisor propio. Configuración, Mi cuenta y Cerrar sesión conservan sus accesos independientes. El botón aparece exclusivamente con el permiso existente `flowia.ver`, tanto en escritorio como en el menú móvil. No cambia el catálogo de permisos.

En escritorio, el asistente es un drawer modal superpuesto de 460 px desde la derecha, sin reservar espacio al contenido. Las páginas conservan exactamente ancho, altura y posición de scroll al abrirlo y cerrarlo. El backdrop semitransparente (44 %) con desenfoque de 5 px bloquea la interacción con el fondo. No se renderiza un botón flotante o una barra inferior.

El diálogo es nativo y modal en TODOS los tamaños; a 700 px o menos ocupa la pantalla completa. Tiene scroll interno, bloqueo del fondo y foco contenido con Tab/Shift+Tab. Cierra con X, Escape y clic en el backdrop donde haya espacio exterior. Un arrastre iniciado dentro no se interpreta como clic fuera. Cambiar de tamaño conserva el análisis y el diálogo sin remontarlo.

La entrada y salida duran 180 ms, con desplazamiento leve y opacidad. El fondo permanece bloqueado durante la salida. Con `prefers-reduced-motion: reduce` no hay animación ni espera para cerrar. Un modal de negocio o una confirmación tiene prioridad: FlowIA se desmonta inmediatamente, cancela el cierre pendiente y cede el foco. Abrir el menú móvil también cierra el asistente.

La cabecera conserva el azul institucional y texto contrastado. Estado, cuerpo y pie comparten una superficie neutra del tema; las tarjetas usan la superficie elevada, tipografía legible y espacios consistentes. Se conserva la semántica de colores en prioridades, advertencias y acciones.

Los accesos son botones con nombre, tooltip, `aria-expanded` y `aria-controls`. El cierre devuelve el foco a un acceso visible, sin desplazar el contenido. Se corrigió la carrera en la que una restauración pendiente podía robar el foco a un panel recién reabierto. La sidebar conserva su scroll en alturas reducidas y el acceso funciona colapsado.

La consulta, orden de recomendaciones, permisos, navegación protegida por borradores y actualización explícita conservan su comportamiento. Entrar a HostFlow o cambiar de página con FlowIA cerrada no consulta recomendaciones. La primera apertura inicia el análisis; reabrir reutiliza el resultado de la sesión. Un error no genera un bucle de reintentos. Cerrar la sesión desmonta estos datos. No se incorporó persistencia nueva.

## Archivos ajustados en el refinamiento modal

- `src/components/flowia/PanelFlowIA.jsx`: diálogo nativo compartido, encabezado visual, foco, backdrop y ciclo de salida.
- `src/pages/FlowIA.jsx`: delega el encabezado al contenedor y estabiliza el callback de cierre; conserva el análisis, caché y acciones.
- `src/styles/workspace.css`: elimina la columna reservada; drawer, backdrop, estilos interiores unificados, acceso sin divisor y movimiento reducido.
- `tests/browser/hostflow-browser.test.js`: destino ficticio adicional de recomendación y cierre explícito del modal antes de interactuar con el fondo.
- `tests/browser/casos-prioritarios.js`: geometría inalterada, foco, responsive, cierre exterior, arrastres, movimiento reducido y navegación protegida con API interceptada. La recarga espera un documento nuevo, evitando confundir el Inicio anterior con la carga siguiente.
- Este documento.

No se modifican `Dashboard.jsx`, `AccesoFlowIA.jsx`, los hooks compartidos, Huéspedes, Configuración, permisos ni backend respecto del estado inicial de este refinamiento. Todos los cambios pendientes anteriores se preservan. Los inventarios y la verificación de la tanda anterior se conservan como evidencia histórica; la comparación actual queda en `revision/flowia-drawer/verificacion-final.json`, fuera de ambos repositorios.

## Validación

- `npm.cmd test` (frontend): 44 aprobadas.
- `npm.cmd test` (backend): 157 aprobadas, herméticas; sin tests de integración SQL.
- `npm.cmd run test:browser`: 31 aprobadas (30 casos y el contenedor), Edge aislado y API interceptada antes de navegar.
- Anchos 1280, 820, 390 y 320 px; móvil de 400 px de alto; sidebar colapsada; claro, oscuro y automático.
- Cobertura de ancho/posición inalterados, navegación de recomendaciones, caché, carga, error/reintento, actualización, apertura por Enter, Tab/Shift+Tab en escritorio y móvil, Escape y foco al cerrar.
- Clic real mediante CDP sobre el backdrop en la posición de Cerrar sesión: cierra solo FlowIA, sin logout ni petición de negocio. El arrastre desde dentro hacia fuera no cierra el diálogo.
- Movimiento reducido sin animación, salida normal manteniendo la modalidad, prioridad del modal de Huéspedes y confirmación de exportación de Reportes. Navegar desde FlowIA a Propiedades con un borrador empresarial muestra la confirmación: cancelar conserva los campos; confirmar descarta y navega sin PUT.
- `npm.cmd run build` y `npm.cmd run lint` (frontend): correctos. El build compila JSX.
- `node --check`: 149 archivos JavaScript backend y 27 frontend, sin errores.
- `git diff --check` en ambos repositorios y comprobación de preservación contra el estado inicial.

Las capturas usan exclusivamente fixtures ficticios y quedan en `revision/flowia-drawer/capturas`, fuera del build y de ambos repositorios.

## Límites y revisión manual

No se conectó a Azure, no se consultó FlowIA real ni se ejecutó SQL. No se modificaron credenciales, archivos `.env`, autenticación, permisos o reglas operativas. No se iniciaron ni reiniciaron servicios de desarrollo: solamente el servidor efímero del navegador aislado, cerrado al finalizar. Sin commits, push o deploy.

El backend se preservó completo. Nota de la revisión anterior: Oxlint sobre `src`, `tests` y `scripts` detectó 109 avisos preexistentes, sin errores; no hay un script lint propio del backend y no se amplió esta entrega visual para corregirlos.

El usuario confirmó posteriormente la aprobación visual del drawer modal, Huéspedes y Configuración. Ver [estado vigente de publicación](estado-publicacion.md). Abrir FlowIA con el backend real conserva los efectos actuales de GET `/recomendaciones`, que puede sincronizar limpiezas; las pruebas de esta entrega interceptan esas llamadas. Esta entrega no autoriza escrituras operativas reales.
