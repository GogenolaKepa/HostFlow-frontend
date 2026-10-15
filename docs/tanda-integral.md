# Entrega de las tres prioridades y mejoras adicionales

> Informe histórico de esa tanda. La solución definitiva de FlowIA es el [drawer modal](flowia-panel-lateral.md). Ver [estado vigente de publicación](estado-publicacion.md) para las validaciones y alcance acumulados; no interpretar las áreas reservadas descritas abajo como el diseño actual.

Implementados y probados: modal de Huéspedes, áreas reservadas de FlowIA y estado
de Configuración conectada/solo lectura. La apariencia sigue siendo una preferencia
local. No se cambiaron permisos, autenticación, rutas de cuentas o datos reales.

Cambios principales:

- DetalleHuesped y guests.css separan ficha e historial del listado. Solicitud
  abortable, 404/error/vacío, contacto/documento/origen, filtro de importes por permiso,
  navegación existente a reserva y conservación del listado/formulario/scroll.
- SecurityDialog comparte bloqueo de scroll con recuento, foco circular y
  restauración sin desplazamiento. useScrollLock contempla el contenedor principal.
- workspace.css dispone contenido/panel/barra en áreas distintas. FlowIA minimiza
  ante diálogos/menú móvil mediante useOverlayPresence; las recomendaciones no cambian.
  El helper de navegación adapta los tres scrollTo de Propiedades al nuevo contenedor.
- PanelConfiguracion consume el estado autorizado del servidor y cierra edición
  si es de lectura o está incompleto. La guarda real de PUT permanece en backend;
  no se agrega una bandera VITE para controlarla. Se conservan borradores.
- Reportes carga jsPDF/AutoTable al exportar; bloquea doble envío y muestra error
  controlado. Principal 922,71 → 492,40 kB; gzip 270,39 → 132,71 kB. Build sin warning.

Validación: 42 tests frontend y 27 de navegador (incluido contenedor), todos aprobados;
build y lint correctos. API completamente interceptada; PDF ficticio validado con
descargas denegadas. Temas Claro/Oscuro/Automático, 320/390/820/1280 px, altura reducida,
sidebar expandida/colapsada, menú móvil, foco, Escape, scroll y errores probados.
No hubo conexiones de prueba a Azure, servicios de desarrollo, commits/push/deploy.

El informe consolidado está en backend/docs/tanda-integral-resultados.md y los
inventarios por repositorio en docs/inventario-tanda-integral.json. Capturas e
inventario inicial/final: revision/tanda-integral fuera de los repositorios.

El usuario puede iniciar manualmente los servicios para revisar. Con datos reales,
mantener HOSTFLOW_CONFIGURACION_READ_ONLY=1. La ficha de Huéspedes solo lee, pero su
acción Ver reserva navega a un módulo que puede sincronizar; abrir FlowIA también
puede escribir limpiezas. Estas acciones solo se probaron con fixtures en esta tanda.
Primer guardado empresarial, publicación y transición de permisos SQL requieren
autorizaciones separadas. No se empezó a implementar Notificaciones.
