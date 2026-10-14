# Configuración y apariencia de HostFlow

## Implementación

Punto de partida: frontend ef9aa6ec82de1f8db1c6d271d891a76275148e0f y backend
ba1bd0ea8c2b30ddbe76e39bbbcdd863739b6557. Ambos estaban limpios al comenzar.
Esta tanda modifica exclusivamente frontend. La publicación del código fue
autorizada por el usuario; no incluye deploy ni cambios del backend o Azure.

Configuración se ubica en la zona inferior, encima del perfil y Cerrar sesión,
separada de la navegación operativa. No se duplica en la lista principal.
Mantiene icono, tooltip, estado activo y acceso por teclado en escritorio,
tablet, barra colapsada y menú móvil. La barra permite desplazamiento vertical
cuando falta altura, sin superponer las utilidades a la navegación. Ambos
roles pueden elegir Claro, Oscuro y Automático. Administrador ve la estructura
general (preferencias, operaciones, empresa, notificaciones, integraciones y
seguridad). Las funciones futuras están señaladas como Próximamente, sin
formularios o botones de guardado simulados. Seguridad enlaza a Usuarios/Mi
cuenta existentes; Usuarios solo se habilita si la gestión SQL está disponible.
Operador únicamente ve Apariencia, sin permisos administrativos nuevos.

La apariencia es una preferencia del navegador, no de Azure: se guarda como
un enum no sensible en localStorage, clave hostflow.apariencia.v1. No lee ni
escribe claves de sesión. La preferencia se conserva después de logout y
login; las cuentas que usen el mismo perfil del navegador comparten esta
elección. Perfiles o navegadores diferentes tienen preferencias independientes.
Sin elección válida, Claro es el valor inicial incluso si el sistema está oscuro.

public/appearance.js es el único controlador del estado de apariencia. Se carga
como script clásico bloqueante en head antes del cuerpo y de React, evitando
que una preferencia oscura guardada pinte primero el tema claro. Valida los
valores, establece data-theme y color-scheme, escucha matchMedia y sincroniza
la preferencia entre pestañas. React consume su snapshot con useSyncExternalStore
y ThemeProvider. El arranque SSR de pruebas no consulta almacenamiento real.
No se agregaron dependencias.

En Automático se conserva ese modo y el tema efectivo sigue el sistema y sus
cambios. Las opciones explícitas prevalecen. Si el almacenamiento está bloqueado,
el tema se aplica en memoria y la pantalla informa que no pudo guardarlo; no
finge persistencia. No se modifican preferencias del sistema operativo.

## Estilos y pantallas

theme.css concentra tokens de superficies, textos, bordes, acciones y estados.
App.css reemplaza colores de cada módulo por esos tokens, conservando layouts,
responsive y comportamiento. Las reglas nuevas no agregan !important ni filtros
globales de inversión. Se mantienen sidebar oscuro y acciones azules en Claro.
En Oscuro se adaptan controles nativos y las superficies de los módulos.

Se revisaron Login, cambio obligatorio, sidebar, Inicio, Propiedades, Reservas,
Huéspedes, Calendario, Limpiezas, Reportes, Alertas, FlowIA, Usuarios, Mi cuenta
y Configuración. Se corrigió el contraste específico de navegación, menú móvil,
roles, mensajes y el botón de FlowIA. Los formularios y confirmaciones de cuentas
conservan su diseño y lógica. Las miniaturas del selector muestran deliberadamente
las paletas clara/oscura para compararlas; no son superficies olvidadas sin tematizar.

Las exportaciones dedicadas de Reportes conservan su paleta para documentos
legibles; no se modificó la lógica de exportación, permisos ni datos.

## Verificaciones realizadas

- 34 pruebas frontend aprobadas: sesión/permisos existentes, bootstrap inicial,
  valores inválidos, persistencia, Automático, cambios de sistema, almacenamiento
  bloqueado, eventos entre pestañas y limpieza de suscriptores; estructura de
  Configuración por permisos y contraste de pares de tokens (mínimo 4,5:1).
- 14 pruebas de navegador aprobadas (13 escenarios y contenedor), en Edge con
  perfil aislado y todas las API interceptadas. Selección real por ratón/teclado,
  recarga, detección del sistema emulada, logout/login manteniendo apariencia,
  inicio de ambos roles y cambio obligatorio sin regresiones.
- Configuración sin desbordes a 320, 390 y 820 px; perfil/Usuarios mantienen
  pruebas de móvil, colapsado y teclado. Módulos operativos poblados con fixtures
  ficticias revisados en Claro/Oscuro y a 390 px. Sin superficies blancas sin
  tematizar en las vistas oscuras comprobadas, ni excepciones del navegador.
- Orden Configuración/perfil/Cerrar sesión verificado para ambos roles, sin
  duplicación; Usuarios solo aparece en Administrador. Se verifican foco y
  desplazamiento en escritorio/tablet a 420 px de altura y menú móvil corto,
  acceso a Configuración por Enter con barra colapsada y cierre del menú móvil.
  El menú móvil queda por encima del botón flotante de FlowIA, conservando los
  diálogos por encima del menú; los tres accesos inferiores se comprueban sin
  elementos superpuestos mediante hit testing.
- Capturas ficticias fuera de los repositorios, bajo revision/configuracion-temas.
  Se bloquea capturar formularios con contraseñas ingresadas.
- Build, lint, sintaxis y git diff --check. Persiste el aviso previo de tamaño
  del bundle. Backend no cambió y no se repitieron sus pruebas ni pruebas SQL.

No se navegó por módulos operativos del backend real para revisar estilos.
Los GET de Reservas, Limpiezas, Alertas y FlowIA pueden escribir; además la
pantalla Calendario consulta Limpiezas aunque /api/calendario sea de lectura.
Toda esa navegación de prueba fue interceptada, sin conexiones a Azure.
Inicio continúa con la lectura sin sincronización implementada en seguridad.

## Revisión manual y pendientes

En http://127.0.0.1:5173, ingresar personalmente y abrir Configuración. Elegir
los tres modos, recargar y volver a ingresar; comprobar Automático cambiando la
apariencia de tu sistema si se desea. Mi cuenta/Usuarios conservan sus accesos.
No guardar cambios de cuentas ni navegar módulos que escriben como prueba visual
sin la autorización operativa correspondiente.

Las capturas automatizadas cubren las vistas representativas, no cada combinación
posible de canales, estados, popovers o textos extensos. La revisión manual en
otros navegadores, con datos largos y distintos ajustes de escala de pantalla
queda pendiente antes del despliegue; no se afirma una certificación completa
de accesibilidad. La sincronización de preferencia por cuenta/dispositivo y las
secciones futuras de Configuración siguen fuera de alcance.

Para producción, servir dist completo incluyendo appearance.js y los assets.
El bootstrap público solo maneja el enum de apariencia: no contiene secretos ni
configuración de conexión. No publicar tests/, fixtures, capturas o .env ni usar
Vite de desarrollo como servidor público. Las guardas JWT/SQL/permisos, roles,
revocación y reglas operativas permanecen intactas.
