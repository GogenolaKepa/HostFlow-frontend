# Demostración universitaria de Monedas — 7 a 9 minutos

## Qué se puede demostrar hoy

La prueba de navegador abre el frontend real y sustituye TODA API antes de navegar.
No hay backend real, SQL ni llamadas BCRA/Gemini. La memoria ficticia se pierde al
terminar; no es evidencia de persistencia Azure. Los datos se encuentran en
`tests/browser/api-jornada-monetaria.js`, con propiedad 50, huésped 60 y reserva 70;
no utilizan los IDs del piloto real. Fechas relativas a Buenos Aires y ejemplos
ARS/USD son didácticos, no cotizaciones actuales.

Desde frontend, Git Bash, para reproducir solo el recorrido integrado:

```bash
HOSTFLOW_TEST_JORNADA_ONLY=1 npm run test:browser
```

El runner usa Edge instalado, un perfil y Vite efímeros, y cierra ambos. No ejecutar
dev/start, SQL ni abrir la aplicación conectada a Azure para sustituir este ensayo.
La suite completa se ejecuta sin esa variable. No activar banderas reales para
realizar la demostración aislada.

Capturas ficticias revisadas: `revision/monedas-y-cotizaciones-facultad-2026-10/jornada/capturas/`.
Se pueden usar junto al resultado del runner durante la explicación. Esta guía
no introduce un servidor DEMO interactivo ni exporta fixtures al build productivo.

## Guion para explicar el recorrido

| Tiempo | Pantalla y acción | Evidencia que mostrar |
| --- | --- | --- |
| 0:00–0:45 | Inicio / Dashboard | Métricas operativas conservadas; contratos por moneda, sin atribuir cobros. |
| 0:45–1:45 | Propiedades | Crear «Jornada USD», USD 99,99 por noche. Cancelar primero la confirmación y después confirmar una vez. Propiedad y tarifa forman una unidad. |
| 1:45–2:45 | Configuración | Revisar la tarifa a USD 100,25, fuente BCRA estadística ficticia. Mostrar fuente/tipo/fecha, hora no publicada y diferencia entre consulta y guardado. |
| 2:45–3:30 | Equivalencia y advertencia | Ejemplo USD 200,50 × ARS/USD 1.250 = ARS 250.625,00. Manual exige advertencia; BNA no se presenta como disponible. |
| 3:30–4:45 | Nueva reserva | Elegir registros ficticios; estimado 0 separado del contrato USD 200,50 pagadero ARS al check-in. Confirmación y un único POST. No confundir el total contractual con el precio por noche. |
| 4:45–5:45 | Detalle / historial | Editar egreso. En fecha de check-in válida consultar y fijar una vez; mostrar USD original, tasa, fecha, autor, equivalente e historial. Escape cancela solo la confirmación. |
| 5:45–6:30 | Calendario / Huéspedes | Explicar la continuidad de la estadía y los importes estimados históricos sin moneda acreditada; no convertirlos por deducción. La regresión general cubre esas pantallas. |
| 6:30–7:30 | Reportes / Alertas / FlowIA | ARS 150.000 y USD 200,50 en grupos separados, un legado excluido. Tarifa ARS con referencia 1.000 y actual 1.250 pierde 20 % de equivalencia USD: aviso único y enlace a revisión, sin ajuste automático. FlowIA reutiliza ese cálculo. |
| 7:30–8:30 | Cancelación / lectura | Cancelar la reserva ficticia; conservar snapshot e historial tras recarga. Mostrar modo lectura y permisos del Operador. |

El recorrido automático cubre también respuesta incompleta, conflicto y commit
incierto: conserva borrador, no anuncia éxito y bloquea el reenvío. Esas pruebas
verifican contratos y orquestación, no fallos físicos de SQL Server.

## Qué falta para una presentación con persistencia real

Se necesitan aprobación del esquema y sus permisos, prueba de motor, creación
autorizada de las tres tablas v2, verificación independiente y activación gradual.
Procedimiento: `backend/sql/proposals/monedas/04_recuperacion.md` en el repositorio
backend. Después se deben aprobar NUEVOS fixtures y cada escritura/lectura dirigida.
No reutilizar ni modificar el piloto histórico 5/17/32/61/62/63.

En una demostración real, la fijación requiere que llegue el check-in y una tasa
acreditada para esa fecha. No cambiar el reloj, backdatear una tasa o modificar la
reserva cancelada del piloto para conseguir una captura. Ante incertidumbre:
detener, recargar e inspeccionar; no reenviar el alta.

Para la facultad alcanza el núcleo ARS/USD, referencia manual/BCRA y trazabilidad.
No prometer API oficial de Booking/Airbnb, Banco Nación automático, cobros,
notificaciones personales de tarifa o garantías de entrega comercial.
