import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';

function contenerTab(event) {
  if (event.key !== 'Tab') return;
  const elements = [...event.currentTarget.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
    .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
  const first = elements[0], last = elements.at(-1);
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export default function PanelFlowIA({ children, id, onClose }) {
  const [cerrando, setCerrando] = useState(false);
  const ref = useRef(null);
  const comenzoFuera = useRef(false);
  useScrollLock();
  // El diálogo permanece modal durante la salida. Un flujo de negocio que lo
  // desmonta tiene prioridad y cancela este temporizador sin restaurar su foco.
  useEffect(() => {
    if (!cerrando) return;
    const timer = setTimeout(onClose, 180);
    return () => clearTimeout(timer);
  }, [cerrando, onClose]);
  useLayoutEffect(() => {
    const panel = ref.current;
    panel.showModal();
    panel.querySelector('.flowia-close')?.focus({ preventScroll: true });
    return () => { panel.close(); };
  }, []);
  const cerrar = () => {
    if (cerrando) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'true') onClose();
    else setCerrando(true);
  };
  const fuera = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  return <dialog ref={ref} id={id} className={`flowia-panel${cerrando ? ' flowia-panel--closing' : ''}`}
    data-flowia-panel="true" aria-label="FlowIA" aria-modal="true"
    onCancel={event => { event.preventDefault(); cerrar(); }} onKeyDown={contenerTab}
    onPointerDown={event => { comenzoFuera.current = event.button === 0 && event.target === event.currentTarget && fuera(event); }}
    onClick={event => {
      if (comenzoFuera.current && event.target === event.currentTarget && fuera(event)) cerrar();
      comenzoFuera.current = false;
    }}>
    <div className="flowia-panel-header">
      <div className="flowia-brand">
        <span className="flowia-brand-icon" aria-hidden="true">✦</span>
        <div><strong>FlowIA</strong><span>Asistente inteligente de HostFlow</span></div>
      </div>
      <button type="button" className="flowia-close" onClick={cerrar} aria-label="Cerrar FlowIA">×</button>
    </div>
    {children}
  </dialog>;
}
