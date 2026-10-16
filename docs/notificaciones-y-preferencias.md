# Notificaciones y preferencias de HostFlow

Estado de cierre confirmado por el usuario: DDL v2 Azure y 55/55 derechos directos
aplicados, CONNECT conocido y roles amplios conservados; pruebas locales de esquema
25/25 y de permisos 8/8 + 18/18 aprobadas. No repetir SQL. La activación funcional de
preferencias sigue pendiente. Fuente detallada: backend/docs/estado-notificaciones-v2.md.
Codex solo ejecuta comprobaciones aisladas; la guía manual vigente está en
HostFlow/revision/cierre-notificaciones/PRUEBAS-WEB.md. Los párrafos de preparación
que siguen describen la historia, no autorizan nuevas migraciones/concesiones.

El guardado exige confirmar ocho opciones persistidas con sus revisiones y valores;
un 200 incompleto conserva el borrador y no muestra éxito. El contrato sigue siendo
el formulario de ocho tipos: la primera escritura crea ocho filas de la cuenta,
aunque se cambie una opción. Debe aprobarse expresamente ese efecto antes de probar.

Actualización de consolidación: prioridad canónica Crítica/Alta/Media/Informativa
o Sin clasificar, conteos singular/plural, vacío filtrado, estados explícitos y
confirmación antes de entrar a gestión. Diseño actual y contratos personales
backend apagados en `backend/docs/consolidacion-notificaciones.md`; no hay UI
personal ni productor activo. La bandeja sigue siendo operativa de lectura.

Entrega local sin commit/push/deploy, Azure ni servicios de desarrollo iniciados
por el agente. El diseño SQL y los contratos están en `backend/docs/notificaciones.md`.

## Interfaz y comportamiento efectivo

Notificaciones aparece una sola vez después de Alertas en la navegación principal
de Administrador y Operador. Usa el permiso `notificaciones.ver`; Usuarios conserva
su permiso exclusivo, Configuración permanece abajo y Mi cuenta sigue en el perfil.
Sidebar colapsada y menú móvil comparten la navegación. No se agrega una campana
flotante, contador no leído, barra permanente ni notificación al iniciar.

La pantalla se titula Notificaciones y se describe con precisión como una bandeja
de avisos operativos ya persistidos. Tiene actualización explícita, paginación de
20, filtros de categoría/prioridad, prioridad con texto además de color, iconos,
fecha real cuando existe, carga, vacío y error con reintento. No hay sondeo ni
marcado leído. No informa eventos inexistentes de limpiezas o sistema.

Su efecto de lectura pide solamente GET `/notificaciones/avisos`; no llama a
`/alertas` ni a FlowIA. Abortar/desmontar evita respuestas tardías. Los DTO se
validan y solo se renderizan sus campos conocidos, ignorando campos anidados
adicionales. El backend además excluye textos económicos/privados en la consulta.
El acceso a gestión de Alertas pide una confirmación que advierte sus posibles
escrituras. Confirmar entra en el módulo operativo existente con sus GET mutantes;
cancelar no consulta Alertas. Se conserva también la protección de borradores.

En Configuración ambos roles disponen de Apariencia, Preferencias generales y
Notificaciones personales. Operador no adquiere Datos de empresa, Preferencias
operativas o Usuarios. Administrador conserva las siete secciones anteriores.

Preferencias de notificaciones se presenta como **todavía no activada** cuando
el backend devuelve NOTIFICACIONES_NO_ACTIVADAS, sin ofrecer reintento para una
desactivación intencional. NOTIFICACIONES_MODELO_PENDIENTE informa preparación
SQL pendiente; conexión/contrato sí permiten reintento. No muestra switches falsos ni
un guardado local. La UI futura, probada con API ficticia, valida ocho tipos, permite
edición únicamente si el servidor confirma SQL/escritura, confirma antes de guardar,
bloquea duplicados/salidas durante la petición y protege borradores al navegar o
recargar. Un 409 conserva opciones y exige recarga; un resultado incierto tampoco
se presenta como éxito. La lectura sola deshabilita campos y oculta el guardado.
Cada cuenta consulta/modifica únicamente sus opciones. Todavía no hay productores
ni políticas empresariales efectivas: las preferencias no silencian las condiciones
operativas ni la bandeja actual. No se envían email/SMS/push.

Preferencias generales agrega una opción completa: reducir movimiento en este
navegador o respetar la preferencia del sistema. La clave local contiene solo ese
valor; no contiene perfil, cuenta, eventos o preferencias SQL. Se conserva al
recargar/volver a ingresar y es compartida por las cuentas de ese navegador. Si
el almacenamiento está bloqueado se aplica temporalmente y se informa que no se
pudo conservar. Los cambios entre pestañas actualizan la preferencia mediante
storage, ignorando claves de sesión. El sistema operativo siempre puede reducir
movimiento, incluso con la opción sistema. FlowIA cierra sin demora artificial
cuando está activa la reducción. La apariencia usa su sistema anterior intacto.
No se implementaron controles decorativos de formato de fecha/hora, semana,
densidad o calendario, porque implican revisar consumidores que hoy no lo admiten.

## Componentes

| Archivo | Responsabilidad |
| --- | --- |
| src/pages/Notificaciones.jsx | Bandeja, filtros, paginación y estados |
| src/components/configuracion/PreferenciasNotificaciones.jsx | Contrato SQL futuro, borradores, confirmación y concurrencia |
| src/components/configuracion/PreferenciasGenerales.jsx | Opción accesible del navegador y aplicación central al montar React |
| src/services/notificaciones.js | Catálogo personal y validadores de DTO |
| src/services/preferenciasNavegador.js | Almacenamiento/subscripción de movimiento, aislado de sesión |
| src/styles/notifications.css | Superficies y estados con tokens existentes, responsive y foco |
| src/styles/accessibility.css | Reducción efectiva y accesibilidad de la opción |
| src/pages/Dashboard.jsx | Acceso y carga diferida de la bandeja |
| src/pages/Configuracion.jsx | Secciones generales/personales compartidas, componente diferido |
| src/main.jsx | Bootstrap de movimiento y CSS centralizado |
| src/components/flowia/PanelFlowIA.jsx | Respeta la reducción local al cerrar; no cambia análisis, caché o modalidad |

Se cargan la bandeja y preferencias personales bajo demanda; no se adelantó la
importación de PDF. El bootstrap de apariencia anterior a React permanece intacto.
La reducción local se aplica al montar React; no se mezcló con el arranque de temas.
Tokens de Claro/Oscuro y Automático, botones nativos, labels, estados anunciados
y contornos de foco comparten el lenguaje visual existente.

## Cómo probar manualmente sin escrituras

El usuario inicia frontend/backend como acostumbra. Mantener desactivadas las dos
banderas nuevas de notificaciones (no añadirlas) y, si prueba Configuración
empresarial, conservar explícitamente su bandera temporal de solo lectura. No se
modificó .env ni se comprobó la configuración de un proceso del usuario en esta
tanda. No dar por permanente ninguna variable temporal de la terminal.

Si usás Git Bash, una terminal nueva de backend puede conservar la configuración
de prueba de lectura mediante este comando temporal (lo ejecutás personalmente):

```bash
HOSTFLOW_AUTH_SOURCE=sql HOSTFLOW_CONFIGURACION_ENABLED=1 HOSTFLOW_EMPRESA_ID=1 HOSTFLOW_CONFIGURACION_READ_ONLY=1 HOSTFLOW_NOTIFICACIONES_SQL_ENABLED=0 HOSTFLOW_NOTIFICACIONES_WRITE_ENABLED=0 HOSTFLOW_NOTIFICACIONES_PERSONALES_ENABLED=0 npm run dev
```

En otra terminal, dentro de frontend: `npm run dev`. No cambia .env ni variables
permanentes. Esto habilita el acceso a la bandeja existente de lectura y mantiene
las preferencias SQL nuevas desactivadas; no ejecuta migraciones. No abre la
aplicación ni navega automáticamente a módulos operativos.

1. Entrar con cada rol y abrir Notificaciones. Solo lee alertas que ya existan;
   puede estar vacía o mostrar información antigua si no hubo sincronización previa.
2. Filtrar, paginar y actualizar. No confirmar «Abrir gestión» para una prueba
   estrictamente de lectura: abriría Alertas con su sincronización habitual.
3. Configuración → Notificaciones debe informar activación pendiente sin guardar.
4. Configuración → Preferencias generales → Reducir movimiento; recargar y volver
   a ingresar. Debe persistir en este navegador; cambiar luego a sistema si se desea.
5. Revisar Claro, Oscuro, Automático, teclado, menú móvil y sidebar colapsada.

No ejecutar FlowIA, Reservas, Limpiezas o Alertas reales como parte de esta
verificación de lectura. No activar aún tablas/banderas SQL futuras. Las pruebas
automatizadas interceptan por completo todas las peticiones antes de navegar.

Pendiente: aprobación visual personal y, por autorización separada, prueba de
lectura real de la nueva bandeja. La escritura de preferencias nuevas y el modelo
SQL no están aprobados ni activados. Resultados de consolidación en
`revision/consolidacion-notificaciones`, fuera del build y de ambos repositorios;
`revision/tanda-notificaciones` conserva evidencia histórica.
