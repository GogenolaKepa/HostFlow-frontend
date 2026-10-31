# Laboratorio de autenticación comercial

Solo fixtures en memoria y proveedor ficticio. No usa .env, Azure, correo real,
server.js ni la sesión del usuario. No integra ni modifica el Login operativo.
Requiere ambos checkouts adyacentes, dependencias existentes y Node compatible con
el proyecto. No instala paquetes. No usar `npm run dev:azure` para este laboratorio.

Desde frontend, Git Bash:

```bash
node tests/manual/autenticacion/servir-integracion.mjs
```

Imprime una URL loopback con puerto efímero, separado de4000/5173. Abrir esa URL.
La franja ENTORNO FICTICIO distingue el laboratorio del producto real. Ctrl+C
cierra los dos servidores efímeros. Al cerrar se pierden los fixtures; no hay
persistencia de producción en memoria ni credenciales reales.

Recorrido reproducible:

1. Recuperación: solicitar para `2@example.invalid`; esperar respuesta neutral.
2. Pulsar «Abrir último enlace ficticio»; definir/confirmar una contraseña de
   al menos12 caracteres y hasta72 bytes. El token permanece solo en memoria y no
   se copia a la URL del laboratorio.
3. Volver al inicio ficticio e ingresar con ese email y la nueva contraseña.
   La versión de sesión anterior queda invalidada por el núcleo real.
4. Cambiar el control Rol a Administrador; entrar en Equipo e invitar nombre/email
   `persona@example.invalid` (Operador fijo).
5. Abrir último enlace ficticio y aceptar con contraseña propia. Ingresar como
   esa cuenta desde el login ficticio. No se inicia sesión automáticamente.
6. Volver al rol Administrador desde la franja, invitar a otro email ficticio,
   revocar con confirmación y abrir su enlace:
   debe indicar que ya no está disponible.
7. Cambiar «Rol» a Operador: no aparece gestión. El servidor también revalida
   la autorización; la franja es un control de test, nunca un selector de rol real.
8. Comparar tema claro/oscuro. Para repetición limpia, reiniciar SOLO el laboratorio.

El botón espera el procesamiento de la última solicitud. Si no se generó correo,
explica la ausencia del enlace; nunca abre un correo de una solicitud anterior.
Si falla el worker/proveedor ficticio, muestra ese estado únicamente en la franja
del laboratorio, conservando la respuesta pública neutral. Al reabrir un enlace
se valida de nuevo incluso si ya se estaba mostrando la misma pantalla.
La cuenta `2@example.invalid` es Operador con contacto verificado ficticio;
el Administrador y cuentas desconocidas NO generan recuperación. Un reenvío
dentro del cooldown tampoco emite otro correo: no es un fallo del botón.

Las pruebas automatizadas cubren expiración, modificación/reutilización de enlace,
sesión obsoleta, errores de red/proveedor, doble envío, concurrencia, permisos y
rollback simulado. No hay interruptores de demo en el build del producto.

Comandos focalizados:

```bash
# frontend
node --test tests/autenticacion-comercial-ui.test.js
node --test tests/browser/autenticacion-comercial.test.js tests/browser/autenticacion-integracion.test.js
npm run lint
npm run build
# backend, desde su carpeta
node --test tests/cuentas-comerciales-http.test.js tests/ingreso-comercial-sql.test.js
```

El navegador usa Edge headless instalado o HOSTFLOW_TEST_BROWSER con otra ruta
Chromium existente. Perfiles y cachés propios, bloqueo de peticiones de página
ajenas al laboratorio, cierre en finally. No utiliza Chrome autenticado del usuario.

Contratos propuestos bajo `/api/cuentas-comerciales` (NO montados en app.js):

| Ruta | Método / entrada / salida |
|---|---|
| /recuperacion/solicitar | POST {email} →202 neutral tras encolar, sin buscar usuario |
| /recuperacion/validar | POST {token} →204 o400 genérico; no consume token |
| /recuperacion/confirmar | POST {token,passwordNueva} →204; no JWT |
| /invitaciones | POST {nombre,email} Admin→202 neutral; Operador asignado por servidor |
| /invitaciones | GET Admin, ?pagina=1→{pagina,hayMas,invitaciones:[id,nombre,email,estado,expiraEn]} |
| /invitaciones/:id/revocar | POST {} Admin→204 |
| /invitaciones/validar | POST {token} →204 o400 genérico |
| /invitaciones/confirmar | POST {token,passwordNueva} →204; nueva identidad Operador |

Sin token en URL de API, almacenamiento persistente ni logs. No-store/no-referrer.
El cliente comercial exige transporte explícito; no importa el Axios operativo.
La validación de enlace que falla por red/503 muestra error de verificación,
no lo presenta falsamente como vencido. Las escrituras inciertas no se reenvían;
el panel permite actualizar datos o salir de la confirmación sin autorizar otro envío.

Pendientes antes de habilitar usuarios reales: validar SQL/migraciones y cuotas
en motor aislado, revisar mínimos/identidades y retención, política Admin/legacy,
proveedor/dominio y vault, mediciones de enumeración temporal bajo contención,
despliegue de workers y revisión del índice del listado paginado.
El ingreso SQL y su decorador están cerrados por defecto. No activar por flag frontend.
