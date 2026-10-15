# Datos de empresa y preferencias operativas

> Documento de implementación y preparación histórica. La persistencia empresarial ya fue confirmada por el usuario y el proceso volvió a solo lectura. Ver [estado vigente](estado-publicacion.md); publicar código no autoriza nuevos guardados o cambios de configuración.

Implementación local sobre frontend 11d8df35fd3b2641a8050f4fce1590ff00b7c5f0.
Sin commit/push/deploy ni activación Azure. No se editaron .env ni secretos.

Configuración mantiene su ubicación inferior, temas y permisos. Datos de empresa
y Preferencias operativas ahora tienen componentes propios y consumen las API
preparadas. Apariencia se extrajo sin modificar su controlador ni almacenamiento.
Usuarios, Mi cuenta, autenticación, Inicio y filtros económicos permanecen iguales.
Solo Administrador tiene configuracion.ver/configuracion.modificar; Operador
conserva Apariencia y sus permisos anteriores.

La interfaz ofrece formularios accesibles y responsive, confirmación de guardado,
errores/validación, borrador preservado, recarga/descartar confirmados y conflictos
de versión. Cuando la persistencia todavía no está activa, muestra ese estado y
no ofrece un guardado simulado. Nunca guarda información empresarial en localStorage.

El protector de borradores es común a las subsecciones y a las salidas desde
Dashboard: navegación principal, perfil, Configuración activa, sidebar colapsada,
menú móvil y logout voluntario. Cancelar conserva campos, errores y sección.
Confirmar permite continuar. Recargar/cerrar usa beforeunload nativo; los cierres
por 401, vencimiento y cambio obligatorio prevalecen sin confirmaciones.
El registro se mantiene solo en memoria y se libera al desmontar; no se conserva
información de una cuenta para otra. No es un autoguardado de formularios.

Hay exclusión de envíos duplicados, bloqueo de salidas durante un guardado y
recarga obligatoria ante 409 o una confirmación incompleta. En este último caso
se conserva el borrador sin afirmar que el servidor no haya guardado: hay que
recargar para conocer el resultado. La validación de respuestas también comprueba
campos, límites, correo, horarios y zona fija antes de usarlos.

Nueva reserva manual consulta solo los horarios por un endpoint GET de lectura
autorizado con reservas.crear. No cambia campos editados, borradores reabiertos,
reservas existentes ni integración/cancelación/limpieza. La zona de Buenos Aires
se muestra fija por decisión aprobada. Si falta configuración, conserva los
horarios actuales del formulario y lo informa.

La propuesta SQL, requisitos de empresa por instalación y límites para una futura
plataforma multiempresa están detallados en backend/docs/configuracion-empresa.md.
No se debe añadir un IdEmpresa elegido por el cliente: el contexto es del servidor.

## Revisión local

El usuario inicia personalmente npm run dev en ambos repositorios. Para probar
con sus cuentas existentes, la terminal del backend necesita HOSTFLOW_AUTH_SOURCE=sql
temporalmente; esta implementación no cambia el valor predeterminado mock.

En Git Bash (terminal MINGW64), desde backend:

```bash
HOSTFLOW_AUTH_SOURCE=sql npm run dev
```

En PowerShell:

```powershell
$env:HOSTFLOW_AUTH_SOURCE='sql'
npm run dev
```

No habilitar todavía HOSTFLOW_CONFIGURACION_ENABLED ni HOSTFLOW_EMPRESA_ID.

Hasta aprobar migración, vinculación, permisos y activación, Datos de empresa y
Preferencias muestran «Pendiente de activar persistencia». Ese es el estado real
del backend; el formulario completo se verificó con API interceptada y SQL LOCAL.
Los fixtures no se importan desde src ni se incluyen en dist. Los tres temas
funcionan tanto para los formularios como para los estados de activación/error.

No abrir Reservas, Limpiezas, Alertas, Calendario o FlowIA en el backend real como
prueba de estilos: algunas de sus consultas disparan escrituras. El browser de
pruebas intercepta todas esas peticiones y no usa cuentas ni datos reales.

No hay nuevos flags de Vite, dependencias ni archivos de prueba dentro de public.
El build conserva el bootstrap de apariencia en head. El aviso previo del bundle
grande permanece. Revisión adicional en otros navegadores/escala queda para antes
del despliegue. No se inició npm run dev ni se dejaron servidores de prueba activos.

Estabilización validada: 41 pruebas frontend y 21 de navegador, con API interceptada.
Los casos nuevos comprueban cancelación/confirmación de salidas, foco/teclado,
recarga y cierre nativos, 401/403 y vencimiento con borrador, un único PUT ante
envíos repetidos, respuesta incompleta, fallos de carga/red y reset de horarios
tras un alta de reserva exclusivamente ficticia. Capturas fuera de Git en
revision/configuracion-estabilizacion, solo datos de prueba.
