import { useEffect, useState } from 'react';
import api from '../../services/api';
import { usePermisos } from '../../context/PermisosContext';
import { AccountAvatar, SecurityDialog, SecurityIcon } from '../security/SecurityUI';
import '../../styles/guests.css';

const fecha = valor => {
  if (!valor) return 'No informada';
  const date = new Date(`${valor}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'No informada' : date.toLocaleDateString('es-AR');
};
const texto = valor => valor === null || valor === undefined || valor === '' ? 'No informado' : valor;
const dinero = valor => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);

export default function DetalleHuesped({ idHuesped, onClose, onVerReserva }) {
  const permite = usePermisos();
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEstado({ cargando: true });
    api.get(`/huespedes/${idHuesped}`, { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!data?.huesped || Number(data.huesped.idHuesped) !== Number(idHuesped) || !Array.isArray(data.huesped.historialReservas)) throw Error('Respuesta incompleta.');
      setEstado({ huesped: data.huesped });
    }).catch(error => {
      if (!controller.signal.aborted) setEstado({ error: error.response?.status === 404 ? 'Este huésped ya no existe o no está disponible.' : 'No pudimos cargar la ficha del huésped. Comprobá la conexión y reintentá.', inexistente: error.response?.status === 404 });
    });
    return () => controller.abort();
  }, [idHuesped, intento]);
  const h = estado.huesped;
  const nombre = h ? [h.nombre, h.apellido].filter(Boolean).join(' ') : 'Ficha del huésped';
  const situacion = h?.tieneReservaActiva ? 'Hospedado actualmente' : h?.proximaReserva ? 'Próxima reserva' : 'Sin reservas activas';
  return <SecurityDialog title={nombre} description="Información del huésped e historial de reservas." className="guest-dialog" onClose={onClose}>
    <div className="guest-dialog-body" aria-busy={Boolean(estado.cargando)}>
      {estado.cargando ? <p className="guest-state" role="status">Cargando ficha del huésped…</p> : estado.error ? <div className="guest-state" role="alert">
        <SecurityIcon name="alert" /><p>{estado.error}</p>{!estado.inexistente && <button type="button" className="secondary-button" onClick={() => setIntento(n => n + 1)}>Reintentar</button>}
      </div> : <>
        <div className="guest-identity"><AccountAvatar nombre={nombre} large /><div><span className="guest-status">{situacion}</span><p>Origen: {texto(h.origenRegistro)}</p></div></div>
        <dl className="guest-profile-data">
          {[['Correo', h.email], ['Teléfono', h.telefono], ['Documento', h.dni], ['Nacionalidad', h.nacionalidad], ['Reservas realizadas', h.cantidadReservas]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{texto(value)}</dd></div>)}
        </dl>
        <section className="guest-history" aria-label="Historial de reservas">
          <h3>Historial de reservas</h3><p>Propiedad, canal y estado informado para cada estadía.</p>
          {!h.historialReservas?.length ? <p className="guest-state">Este huésped todavía no posee reservas.</p> : <ol className="guest-reservations">
            {h.historialReservas.map(r => <li className="guest-reservation" key={r.idReserva}>
              <div className="guest-reservation-title"><strong>{texto(r.propiedad)}</strong><span className="guest-status">{texto(r.estado)}</span></div>
              <dl><div><dt>Canal</dt><dd>{texto(r.canal)}</dd></div><div><dt>Estadía</dt><dd>{fecha(r.fechaIngreso)} → {fecha(r.fechaEgreso)}</dd></div>
                {permite('reservas.importes') && r.montoEstimado !== null && r.montoEstimado !== undefined && Number.isFinite(Number(r.montoEstimado)) && <div><dt>Importe estimado</dt><dd>{dinero(Number(r.montoEstimado))}</dd></div>}
              </dl>
              <button type="button" className="secondary-button" onClick={() => { onClose(); onVerReserva(r.idReserva); }}>Ver reserva <span className="sr-only">#{r.idReserva}</span></button>
            </li>)}
          </ol>}
        </section>
      </>}
    </div>
  </SecurityDialog>;
}
