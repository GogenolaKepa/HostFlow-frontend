export default function AccesoFlowIA({ abierta, panelId, onClick, movil = false }) {
  return <button type="button"
    className={`${movil ? 'mobile-nav-item mobile-flowia' : 'sidebar-nav-item sidebar-flowia'} ${abierta ? 'is-open' : ''}`}
    aria-label={abierta ? 'Cerrar FlowIA' : 'Abrir FlowIA'} aria-controls={panelId} aria-expanded={abierta}
    title={abierta ? 'Cerrar FlowIA' : 'Abrir FlowIA'} onClick={onClick}>
    <span className={movil ? 'mobile-nav-icon' : 'sidebar-nav-icon'} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" focusable="false">
        <path d="M12 2c1.4 6.2 3.8 8.6 10 10-6.2 1.4-8.6 3.8-10 10C10.6 15.8 8.2 13.4 2 12c6.2-1.4 8.6-3.8 10-10Z" />
      </svg>
    </span>
    <span className={movil ? undefined : 'sidebar-nav-label'}>FlowIA</span>
  </button>;
}
