import { useEffect, useState } from 'react';
import { usePermisos } from '../../context/PermisosContext';
import api from '../../services/api';
import { formatearTotalMonetario } from '../../services/importes';
import { fechaNegocio } from '../../services/monedasCalculos';
import { leerResumenMonetario } from '../../services/resumenMonetario';

export default function IngresosDashboard({ onVerHistorico, onVerMonedas }) {
  const permite = usePermisos();
  const puedeConsultar = permite('reportes.economia');
  const mes = fechaNegocio().slice(0, 7);
  const [lectura, setLectura] = useState(null);
  const actual = lectura?.mes === mes ? lectura : null;
  const data = puedeConsultar ? actual?.data : undefined;

  useEffect(() => {
    if (!puedeConsultar) return;
    const controller = new AbortController();
    const [anio, numeroMes] = mes.split('-').map(Number);
    const ultimoDia = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
    const filtros = { fechaDesde: `${mes}-01`, fechaHasta: `${mes}-${ultimoDia}` };
    leerResumenMonetario(api, filtros, controller.signal)
      .then(data => { if (!controller.signal.aborted) setLectura({ mes, data }); })
      .catch(() => { if (!controller.signal.aborted) setLectura({ mes, error: true }); });
    return () => controller.abort();
  }, [mes, puedeConsultar]);

  const sinMoneda = data?.disponible && BigInt(data.sinMoneda) > 0n;
  const pendiente = data?.disponible === false;
  const importes = data?.disponible ? data.porMoneda : [];
  let estado;
  if (!puedeConsultar) estado = 'Tu perfil no tiene acceso a los importes monetarios.';
  else if (!actual) estado = 'Consultando importes…';
  else if (pendiente) estado = 'Los acuerdos monetarios no están habilitados.';
  else if (actual.error) estado = 'No se pudieron consultar los importes del mes.';
  else if (!importes.length && !sinMoneda) estado = 'Sin importes acordados este mes.';

  return (
    <article className="card dashboard-ingresos" aria-labelledby="dashboard-ingresos-titulo">
      <h2 id="dashboard-ingresos-titulo">Ingresos del mes</h2>
      <div role="status">
        {estado && <p>{estado}</p>}
        {importes.length > 0 && (
          <>
            <ul>{importes.map(({ moneda, importe }) => <li key={moneda}>{formatearTotalMonetario(importe, moneda)}</li>)}</ul>
            <p>Importes acordados de reservas, sin registro de cobro.</p>
          </>
        )}
        {sinMoneda && <p>Reservas sin moneda declarada: {data.sinMoneda}. Quedan fuera de los totales.</p>}
      </div>
      <div className="dashboard-ingresos-acciones">
        {puedeConsultar && permite('reportes.ver') && <button type="button" className="ux-text-button" onClick={onVerHistorico}>Ver histórico</button>}
        {puedeConsultar && (pendiente || sinMoneda) && permite('configuracion.ver') && (
          <button type="button" className="ux-text-button" onClick={onVerMonedas}>Monedas y cotizaciones</button>
        )}
      </div>
    </article>
  );
}
