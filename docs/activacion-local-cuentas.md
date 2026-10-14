# Validación local de cuentas SQL y navegación normal

Administrador y Operador reales completaron ingreso, cambio obligatorio y
Mi cuenta en perfiles separados. Las comprobaciones reales anteriores aprobaron
permisos, 401/403 y filtros de reportes e histórico, sin compartir credenciales.
Ver ../../backend/docs/cierre-seguridad.md para evidencia y límites.

## Navegación definitiva

Login y restauración de sesión abren Inicio para ambos roles. Si hay cambio
obligatorio, se completa primero y después se monta Inicio. Mi cuenta continúa
en el perfil inferior y Usuarios permanece exclusivo del Administrador.
Se eliminaron VITE_HOSTFLOW_INITIAL_SECTION, su prop seccionInicial y el modo
de pruebas HOSTFLOW_TEST_INITIAL_ACCOUNT. No hay una modalidad oculta de cuentas.

El montaje, refresco periódico y recarga de Inicio solo consultan auth/me,
dashboard/resumen e historico. El backend separa la lectura de alertas
registradas de la sincronización: Inicio no actualiza la tabla Alertas.
El Centro de alertas mantiene su sincronización y muestra condiciones actuales
cuando se consulta. Inicio informa «Alertas registradas» y no promete nuevas
alertas sin sincronizar. Calendario utiliza consultas de lectura sin cambios.

Para iniciar frontend desde su carpeta, únicamente en la terminal local:

```powershell
$env:VITE_API_URL = 'http://127.0.0.1:4000/api'
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

La sesión local del backend usa HOSTFLOW_AUTH_SOURCE=sql temporalmente. El valor
por defecto del código en desarrollo sigue siendo mock; producción exige SQL
explícito. No editar .env, importar mocks, repetir migración o bootstrap.

La regresión real de Reservas, Limpiezas, Alertas y FlowIA sigue pendiente:
sus GET pueden escribir y requieren autorización antes de probarlos con Azure.
No navegar a ellos para simular permisos ni operaciones en datos existentes.

## Pruebas finales

- Frontend: 24 aprobadas; build y lint aprobados.
- Navegador: 13 aprobadas (12 escenarios y contenedor), con API interceptada.
  Incluye Admin/Operador en Inicio, recarga desde Mi cuenta, cambio obligatorio
  seguido de Inicio, perfil, logout y ausencia de peticiones a sincronizaciones
  de otros módulos durante el ingreso.
- Backend: 110 aprobadas; cuatro regresiones nuevas prueban rutas/controlador,
  servicios y repositorios reales con SQL simulado. GET Inicio no ejecuta DML,
  no sincroniza, conserva permisos y redacta economía anidada del Operador.

Las páginas tests/manual/roles-reales.html y su JS se conservan para comprobación
local explícita, solo con GET revisados y salida de estados. No forman parte
de dist ni deben desplegarse como contenido público. El navegador automatizado
no accede a Azure ni a las sesiones reales. Persiste el aviso de bundle grande.
El pulido visual aprobado está detallado en pulido-visual-seguridad.md.
