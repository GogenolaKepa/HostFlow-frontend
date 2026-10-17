# Consultas y operaciones explícitas

El backend de esta fase conserva Azure SQL HostFlow. Navegar, abrir detalles y
recargar datos no finaliza reservas ni sincroniza alertas/limpiezas. FlowIA analiza
lo persistido y conserva motor, caché, permisos y actualización explícita.

- Reservas: `Finalizar vencidas`, solo Administrador, informa alcance global y
  pide confirmación. No toma filtros como límite; confirma todas las Confirmadas
  con egreso anterior a hoy en Buenos Aires. Las vencidas indican finalización
  pendiente y no habilitan editar/cancelar para eludir el cierre.
- Limpiezas: `Recargar datos` consulta. `Sincronizar` requiere confirmación y
  ejecuta el comando existente de generación/actualización/cancelación derivada.
- Alertas: `Recargar datos` consulta. `Sincronizar alertas` requiere confirmación
  para evaluar condiciones y persistir/resolver. Ambos roles conservan su permiso.
- Cancelar o Escape en la confirmación no envía POST. Se usa SecurityDialog con
  foco/scroll/temas compartidos, y un bloqueo síncrono evita duplicar confirmaciones.
- Ante resultado incierto se informa error y se pide recargar antes de repetir.
  Si el comando se confirmó pero falla el GET posterior se diferencian ambos hechos.

No hay sincronización automática sustituta al entrar, recargar o iniciar. Después
de cambios de reservas/incidencias o del día de negocio, la persona autorizada
ejecuta el mantenimiento explícito correspondiente. No se promete información
recién sincronizada por consultar una vista. Debe revisarse este flujo en aceptación.

No se modifican Mi cuenta, Huéspedes, drawer FlowIA, permisos, Configuración ni
banderas de Notificaciones. No se habilita escritura empresarial/personal nueva.
Las pruebas interceptan toda API; no verifican Azure ni atomicidad del motor.
La corrección del formulario carga propiedades/huéspedes mediante los GET
existentes completos, exige selección explícita y elimina IDs, fechas e importes
de ejemplo. El POST no envía canal ni estado; los decide el servidor. Los horarios
iniciales provienen de Configuración y se respeta el borrador. Edición y cancelación
conservan mensajes seguros de concurrencia/incertidumbre, sin reenvío automático.

Como evidencia separada de las pruebas aisladas, el usuario completó un piloto
ficticio de alta/edición/cancelación desde la web el 17/10/2026. Los estados e
historial se comprobaron con SELECT en Azure y F5; no es una validación global de
concurrencia o rollback del motor. No repetir las altas ni eliminar esos fixtures.
Los comandos de desarrollo los inicia el usuario. Guía detallada y pendientes:
`HostFlow/revision/normalizacion-operativa-azure/GUIA-USO-AZURE.md`.
