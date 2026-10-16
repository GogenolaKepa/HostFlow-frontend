# Regresión de lecturas operativas — octubre

Correcciones puntuales; no se cambian temas, navegación, permisos, configuración
empresarial, preferencias personales ni diseño de los modales aprobados.

- FlowIA valida la forma del análisis antes de reemplazar su estado. Una respuesta
  sin lista válida o con tarjetas incompatibles muestra error recuperable; no
  equivale a «sin recomendaciones». Si había análisis, se conserva al fallar una
  actualización. Motor, caché en sesión y consulta explícita permanecen iguales.
- Corrección del cierre final: restaura el foco después del commit que retira el
  diálogo y cancela el frame pendiente al reabrir/desmontar. Evita perder el foco
  si el frame del evento de cierre se adelantaba a React; otro modal conserva prioridad.
- El detalle de reservas aborta sus cuatro consultas al cerrar, abrir otra reserva
  o desmontar. También ignora una respuesta de una apertura anterior. Escape
  cancela la consulta pendiente. Una sección sin lista válida informa su error
  independiente y mantiene las otras secciones y el cierre disponibles.
- Las pruebas SSR y de navegador tienen cachés Vite temporales independientes,
  fuera de node_modules y del build; cierran el servidor y limpian su propia caché.
  Se evita la colisión EPERM observada entre suites concurrentes y con desarrollo.

Pruebas: `tests/contratos-operativos.test.js` y `tests/browser/casos-integrales.js`,
incluidas en los comandos existentes. Las pruebas de navegador interceptan toda API
antes de navegar. Usan dos reservas ficticias para reproducir respuesta tardía,
contratos rotos y errores de FlowIA en claro, oscuro y automático. La suite existente
mantiene foco, Escape, scroll, responsive, borradores, PDF y ambos roles.

No se ejecutaron consultas reales de recomendaciones o reservas: esos GET pueden
escribir. No se inició npm run dev. Los resultados, inventarios y capturas ficticias
están en `HostFlow/revision/auditoria-integral-octubre`, fuera de ambos repositorios.
El usuario debe iniciar los servicios personalmente cuando autorice su prueba manual.
