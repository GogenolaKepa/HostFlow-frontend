# Estado vigente de la entrega acumulada

Este documento complementa los informes históricos: el estado visual definitivo de FlowIA es el [drawer modal](flowia-panel-lateral.md), y ya no la barra inferior o el panel que comprimía el contenido.

## Alcance completo para publicar

- Datos de empresa y Preferencias operativas conectados a la API SQL, con estado de persistencia del servidor, consulta, validaciones, confirmación de guardado, manejo de conflictos y recarga. El IdEmpresa lo decide exclusivamente el backend.
- Solo lectura: campos deshabilitados y sin Guardar. Si falta un contrato válido también se cierra la edición. Una respuesta 503 de solo lectura conserva el borrador y bloquea nuevos intentos. El backend sigue siendo la autoridad.
- Protección de borradores al cambiar sección, perfil, menú, salir o recargar, y bloqueo durante guardado. Revocación/expiración y cambio obligatorio prevalecen sobre una confirmación pendiente.
- Horarios empresariales como predeterminados de nuevas reservas manuales, sin reemplazar campos ya editados, borradores ni horarios de canales o reservas anteriores. Buenos Aires permanece fija.
- Ficha de Huéspedes en modal accesible con carga, errores, historial y filtro de importes por permisos; conserva listado, edición y scroll.
- FlowIA en menú lateral/móvil y drawer nativo modal: backdrop difuminado, fondo inerte, ancho/scroll del contenido intactos, foco, teclado, salida y movimiento reducido. Caché, actualización y acciones preservadas; las confirmaciones de negocio tienen prioridad.
- Propiedades desplaza dentro del contenedor compartido. PDF importa jsPDF y AutoTable solo al exportar, conserva permisos, bloquea doble envío y maneja errores.
- Claro, Oscuro y Automático siguen centralizados y se guardan localmente. No se agrega almacenamiento de apariencia en Azure.

## Validación final

44 pruebas frontend y 31 de navegador (30 casos y el contenedor), con Edge aislado y API interceptada antes de navegar. Backend: 157 pruebas herméticas. Build y lint frontend correctos; sintaxis de 27 JS frontend y diff sin errores de whitespace. JSX se comprueba con build y lint.

Se revisó el build: `appearance.js` incluido, PDF en chunks diferidos y sin tests, fixtures, SQL o herramientas manuales entre los archivos producidos. JavaScript principal minificado: 494,58 kB; gzip: 133,58 kB. No hay advertencia de chunk mayor a 500 kB, aunque queda poco margen para añadir código al principal.

El usuario aprobó visualmente FlowIA, Huéspedes y Configuración y confirmó persistencia empresarial real mediante la interfaz. La auditoría final del agente no repite esa escritura ni consulta Azure. La configuración de solo lectura vigente se toma de la confirmación del usuario; no se inspeccionan sus credenciales o entorno privado.

## Publicación y límites

Publicar código no cambia variables del backend, activa SQL, habilita guardados o despliega. Conservar `HOSTFLOW_CONFIGURACION_READ_ONLY=1` en el proceso que el usuario inicia manualmente. No ejecutar consultas operativas reales para validar esta publicación: GET de FlowIA puede sincronizar limpiezas.

Los informes e inventarios anteriores se conservan como registros históricos, sin regenerar sus huellas. La lista completa actual de archivos aprobables y sus huellas se prepara fuera de ambos repositorios, en `revision/auditoria-publicacion`.

No incluir `.env`, `node_modules`, `dist`, logs, capturas, perfiles de navegador, archivos de revisión privados o resultados de Azure. Los fixtures usan datos ficticios y forman parte de las pruebas, no del build. El logo y la imagen hero ya versionados se conservan intactos.

Sin funcionalidades nuevas en esta auditoría, sin cambios de autenticación/permisos y sin consultas SQL. No se iniciaron servicios de desarrollo, ni se ejecutó staging, commit, push o deploy. La autorización de publicación continúa pendiente.
