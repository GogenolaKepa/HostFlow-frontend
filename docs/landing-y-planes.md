# Portada pública y modalidades comerciales

La portada está implementada en `/`, para visitantes sin sesión. `/login` conserva
el formulario existente. Una sesión válida entra directamente al panel, incluso
desde `/`. Las rutas `/cuenta/*` conservan prioridad y retiran el token del enlace
antes del primer render. Volver desde ellas lleva a `/login`.

## Alcance actual

- Landing cargada en un chunk independiente; fotografía ya autorizada del login.
- Vista del producto con datos ilustrativos, sin llamadas a datos operativos.
- Modalidades orientativas en `src/services/catalogoComercial.js`: id, nombre,
  descripción, estado, precio, moneda, periodicidad, límites, características y CTA.
- Precios/moneda/periodicidad/límites comerciales aún nulos, contratación desactivada.
- La elección prepara un mensaje local para copiar. No envía un formulario, persiste
  una solicitud, crea cuentas, aplica límites ni cobra. Si se cambia la modalidad o
  la cantidad, se retira el mensaje anterior. No se inventó contacto comercial.
- Roles, JWT, endpoints y permisos se conservan. No existe registro público de empresas.
- Simulación multicanal e IA opcional se explican con sus límites reales. Invitaciones
  y recuperación por correo no se presentan como activadas en la instalación real.

Para revisar localmente, iniciar manualmente el frontend habitual y abrir `/` en una
ventana privada sin sesión. No es necesario iniciar el backend para ver la portada.
Para probar login y panel sí se necesita el backend legítimo del usuario.

## Evolución mínima a contratación: diseño, sin endpoints ni tablas implementados

1. Aprobar catálogo y canal de contacto. Versionar precio/moneda/periodicidad/límites
   en servidor. El navegador podrá mandar `planId`, `catalogoVersion` y volumen;
   nunca determinar el precio cobrado o el permiso de acceso.
2. Una solicitud comercial futura necesitará recepción real, política de privacidad,
   minimización de datos, protección antiabuso y consentimiento. No reutilizar la
   invitación de Operadores como alta de una empresa o como solicitud comercial.
3. Solo después de resolver autorización y aislamiento por empresa: modelo revisable
   de contrato/plan versionado por empresa, estado y referencias del proveedor. No
   considerar `HOSTFLOW_EMPRESA_ID` prueba de aislamiento ni alterar cuentas actuales.
4. Integrar un checkout hospedado del proveedor aprobado; no almacenar tarjetas.
   Confirmar suscripción/pago consultando al proveedor, no por una URL de retorno.
   Webhooks firmados, idempotencia y conciliación durable, con rechazo de replay y
   asociación inequívoca empresa/contrato. Ninguno está activado en esta entrega.
5. Aprobar estados de acceso, mora, cancelación y devolución antes de aplicarlos.
   Conservar historial y verificar consecuencias; no convertir un aviso o callback
   fallido en baja automática de una empresa.

La investigación de proveedores, costos de referencia, HTTPS y autorizaciones Azure
queda en el checkpoint externo `revision/activacion-landing-authcom-2026-11-01/`.
No existe un tarifario aprobado, pasarela configurada, suscripción o deploy público.

## Validación focalizada

`node --test tests/catalogo-comercial.test.js`

`node --test tests/browser/landing-publica.test.js`

El navegador usa Vite en puerto efímero, Chrome con perfil propio y API interceptada.
Comprueba 1440/768/390/320, ausencia de imagen, teclado, movimiento reducido, consulta
local, aislamiento de rutas, login y restauración de sesión. Los procesos propios se
cierran al terminar. El E2E comercial existente adaptó solo la ruta del login y acredita
compatibilidad React/Express con persistencia/correo ficticios, no Azure SQL.
