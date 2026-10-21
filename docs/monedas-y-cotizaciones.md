# Monedas y cotizaciones — interfaz local integrada

El núcleo está implementado y probado con API ficticia. Las tres tablas nuevas
no se aplicaron ni se validaron con un motor. Las banderas permanecen apagadas
por defecto; no se modificó .env ni se publica este módulo.

## Recorrido y representación

- Propiedades: nueva propiedad permite elegir ARS/USD y precio por noche con
  confirmación. Propiedad y tarifa se solicitan juntas. La tarifa declarada es
  autoritativa; las revisiones se hacen en Configuración. Editar otros datos no
  envía un segundo precio. El legado sin moneda se identifica explícitamente.
- Configuración → Monedas y cotizaciones: fuente/tipo/valor/fecha real, hora
  ausente, última consulta y guardado se distinguen. BCRA se consulta por botón,
  nunca por render. Manual exige la advertencia y confirmación. Banco Nación
  continúa no disponible. Equivalencias y simulación se rotulan como vistas previas.
- Nueva reserva: selección real de propiedad/huésped y reglas anteriores
  preservadas. Con acuerdos activados se declara moneda, importe contractual,
  regla de pago y fuente. No se copia automáticamente precio por noche o monto
  estimado. El Operador conserva el alta y su proyección económica restringida.
- Detalle de reserva Manual: Administrador puede declarar/revisar un acuerdo
  explícito, consultar referencia y fijar una sola vez en fecha válida. Importe
  USD original, moneda/regla, autor, revisión y snapshot se conservan. El panel se
  carga bajo demanda, con estado accesible, sin aumentar el bundle inicial.
- Antes del check-in solo hay estimación. Última oficial anterior exige aceptación;
  manual exige su advertencia. Se informan fecha efectiva, hora no publicada y
  consulta. No se fija una tasa posterior para reconstruir un check-in pasado.
- Tras fijar, ingreso/hora quedan protegidos; egreso conserva las reglas anteriores.
  Cancelar conserva el acuerdo y el historial. Reservas cerradas quedan en lectura.
  No hay cobros, pagos, señas ni conversión de importes recibidos de canales.
- Calendario y detalle de Huéspedes conservan sus importes estimados con moneda
  no acreditada cuando el contrato original no la informa. No se usa la moneda
  de un acuerdo para reinterpretar automáticamente otro campo histórico.
- Dashboard/Reportes muestran acuerdos por moneda original y periodo/filtros.
  Desconocidos fuera de sumas, canceladas/no show excluidas. CSV propio con moneda
  y filtros; métricas operativas y PDF diferido preservados. Equivalente no es
  otro ingreso y el monto estimado no se presenta como cobro.
- Alertas y FlowIA reutilizan los avisos derivados de tarifa: umbral 15 %,
  fuente/fecha, una tarjeta por propiedad y enlace protegido a Configuración.
  No cambian precios ni consultan Gemini. Notificaciones persistidas no se activan.

## Seguridad de interacción

Confirmaciones accesibles, Escape/foco/modales anteriores y protección de
borradores se mantienen. Doble clic no duplica envíos. Un conflicto, resultado
incierto o confirmación incompleta conserva los campos y bloquea reenvío hasta
recargar; no se anuncia éxito sin acreditar contrato. La validación del alta
respeta los campos económicos que el backend permite ver a cada rol.

Modo lectura conserva la consulta y deshabilita acciones de persistencia. Sin
modelo no hay fallback ficticio ni localStorage que simule una tarifa o contrato
guardados. No cambiar las banderas de lectura con acuerdos existentes y escritores
activos; ver el procedimiento backend antes de cualquier activación/recuperación.

## Pruebas y demostración

66 pruebas frontend y 89 de navegador completo aprobadas (88 casos y contenedor),
toda API interceptada antes de navegar; backend completo 462. Build/lint correctos;
principal 461,38 kB, panel monetario y PDF diferidos. Claro, oscuro, automático,
320 px, permisos, borradores y errores sin reenvío cubiertos.

[Guion de demostración](demo-monedas.md).
Contratos y activación: `backend/docs/monedas-y-cotizaciones.md`, repositorio hermano.
Evidencia externa en revision/monedas-y-cotizaciones-facultad-2026-10/jornada/.
El navegador usa únicamente fixtures en memoria, no una base DEMO ni datos reales.
