import { useEffect, useState } from 'react';

// Los diálogos de cada módulo mantienen sus propios contratos. El asistente cede
// su espacio cuando existe un flujo modal o el menú móvil, sin tocar su lógica.
const selector = 'dialog[open]:not([data-flowia-panel]), [aria-modal="true"]:not([data-flowia-panel]), .reservation-detail-backdrop, .calendar-day-modal-backdrop, .property-image-preview-backdrop, .reportes-export-overlay, .dashboard-metric-overlay';
export function useOverlayPresence({ incluirMenu = true } = {}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const update = () => setActive(Boolean(document.querySelector(selector + (incluirMenu ? ', .mobile-nav-drawer' : ''))));
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-modal'] });
    update();
    return () => observer.disconnect();
  }, [incluirMenu]);
  return active;
}
