# Pulido visual de Usuarios y Mi cuenta

## Cambios

Usuarios reúne el título y el alta destacada con una tarjeta de equipo que
contiene búsqueda, estado, listado y paginación. Avatares de iniciales, etiquetas
de rol y estado, avisos de cambio pendiente y acciones con texto permiten
identificar cada cuenta. El contador usa el total del servidor y aclara cuándo
hay filtros; no se muestran métricas inventadas.

Alta, edición y restablecimiento usan diálogos nativos con título accesible,
foco contenido, Escape y devolución de foco. Las confirmaciones de estado y
cambios sensibles propios sustituyen window.confirm con el mismo requisito
de confirmación antes de enviar. Cancelar no envía solicitudes de escritura.
Los campos se bloquean durante la operación; los errores del backend se
presentan sin reinterpretar permisos. Recargar datos descarta el formulario
y consulta nuevamente los datos, conservando la recuperación de conflictos.

Mi cuenta presenta el perfil, correo y rol, junto con tarjetas de datos
personales y contraseña. El rol procede de la sesión validada; el nombre
visible no determina privilegios. El acceso desde el perfil lateral y el botón
independiente de salida se mantienen. El cambio obligatorio sigue mostrando
solo el formulario de contraseña, sin negocio ni edición de nombre.

Los campos de contraseña están ocultos inicialmente y tienen botones de
visibilidad accesibles, autocomplete y ayuda de política/confirmación. Los
indicadores reflejan la validación existente, sin un estimador de fortaleza
decorativo. No se persisten ni registran contraseñas y se limpian al cancelar
o completar la operación. Mostrar una contraseña requiere una acción explícita.

Los estilos reutilizan variables hf de superficies, bordes y texto y añaden
variables de cuentas para acciones y estados. Se mantuvieron el azul principal
y el sidebar existentes. No se implementó cambio de tema ni otra funcionalidad.
La tabla se presenta como tarjetas en celulares; formularios y perfil se
reorganizan en una columna y los diálogos se desplazan dentro de la pantalla.
Se dejó espacio inferior para las acciones sin solaparlas con el botón FlowIA.

## Alcance funcional

No cambiaron endpoints, payloads, versiones de registro, revocación, política
de contraseñas, autorización ni repositorios SQL. El listado descarta respuestas
de consultas abortadas para evitar presentar resultados de filtros anteriores.
No se conectó a Azure para probar este pulido, no se crearon usuarios reales,
no se restablecieron contraseñas existentes ni se ejecutaron consultas operativas.
La validación real anterior está documentada en backend/docs/cierre-seguridad.md.

## Pruebas finales

- Frontend: 24 aprobadas (cuentas, permisos, sesión y controles accesibles).
- Navegador aislado: 13 aprobadas (12 escenarios y contenedor). Alta, edición,
  activar/desactivar, restablecer, cancelar, visibilidad de contraseña,
  búsqueda vacía, estado, paginación y reinicio de página al filtrar.
  Incluye respuestas simuladas de error y último Administrador sin cambiar
  la cuenta, confirmación de cambios propios y cancelación sin PUT.
- Inicio: ambos roles entran al Dashboard, también después del cambio obligatorio
  y al recargar desde Mi cuenta. No consulta las sincronizaciones de otros módulos.
- Responsive: capturas y comprobaciones de desborde a 320, 360, 390, 820 y
  1280 píxeles. Perfil lateral por teclado, colapsado y móvil siguen validados.
- Backend: 110 pruebas herméticas aprobadas, incluyendo seguridad y permisos,
  y la separación entre lectura de Inicio y sincronización de alertas.
- Build y lint aprobados. Persiste advertencia de tamaño del bundle.

Las capturas opcionales del runner contienen exclusivamente datos ficticios
y rechazan formularios con contraseñas ingresadas. Se guardan fuera de los
repositorios, sin formar parte de los commits o el despliegue.

## Ajustes temporales y producción

Se conservan todas las protecciones: JWT, autorización, cambio obligatorio,
verificación de sesión, bloqueo del último Administrador y revocación.
No hay menú limitado a cuentas ni opción de pantalla inicial temporal: se
retiraron VITE_HOSTFLOW_INITIAL_SECTION y el modo especial de pruebas.
Inicio es siempre la primera pantalla después del flujo de seguridad.
HOSTFLOW_AUTH_SOURCE=sql sigue temporal en el
proceso local; .env y variables permanentes no se modificaron.

Antes de la regresión operativa real deben autorizarse los GET que escriben
(reservas, limpiezas, alertas, recomendaciones/FlowIA). dashboard/resumen ahora
solo lee las alertas registradas, sin sincronizar ni modificar datos.
No se los ejecutó contra Azure durante este pulido.

Publicar frontend únicamente desde dist: el build no incluye tests/manual,
tests/browser, fixtures, informes, capturas ni .env. No desplegar el servidor
Vite de desarrollo o el repositorio completo como contenido público.
En backend, excluir las pruebas SQL locales y sus herramientas/artefactos de
la distribución de ejecución: tests/, scripts/prepararSQLLocal.js,
scripts/comprobarSQLLocal.js y sql/proposals/. La inspección/administración
SQL son herramientas independientes privadas, nunca endpoints públicos ni
procesos de inicio. No ejecutar scripts de preparación al desplegar.

El titular aprobó el resultado visual y autorizó la publicación después de la
regresión final y revisión de seguridad. No crear ni modificar cuentas reales
para probar el diseño. Publicar el código no aplica SQL ni hace deploy.
Ver inventario y documentación de publicación en docs del backend.
