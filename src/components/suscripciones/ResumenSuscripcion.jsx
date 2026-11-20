import { useEffect, useId, useState } from 'react';
import { consultarSuscripcionEmpresa, listarEmpresasSuscripcion } from '../../services/consultaSuscripcion.js';
import './consulta-suscripcion.css';

const mensajeError = error => {
  if ([401, 403].includes(error.response?.status)) return 'Tu sesión no tiene acceso a esta consulta.';
  if (error.codigo === 'CONSULTA_NO_DISPONIBLE' || error.response?.status === 404) {
    return 'La consulta de suscripción no está disponible.';
  }
  return 'No pudimos verificar el plan y el consumo.';
};

function ConsumoEmpresa({ api, empresa }) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const solicitud = new AbortController();
    consultarSuscripcionEmpresa(api, empresa.idEmpresa, solicitud.signal).then(
      datos => { if (!solicitud.signal.aborted) setResultado({ api, datos }); },
      error => { if (!solicitud.signal.aborted) setResultado({ api, error: mensajeError(error) }); },
    );
    return () => solicitud.abort();
  }, [api, empresa.idEmpresa]);

  if (resultado?.api !== api) return <p role="status">Consultando el plan y el consumo…</p>;
  if (resultado.error) return <p role="alert">{resultado.error}</p>;

  const datos = resultado.datos;
  return (
    <div className="hf-suscripcion__consumo">
      <p className="hf-suscripcion__empresa">{empresa.nombre}</p>
      <dl>
        <div>
          <dt>Plan actual</dt>
          <dd>{datos.nombrePlan}</dd>
          <dd className="hf-suscripcion__detalle">Ciclo {datos.ciclo.toLowerCase()}</dd>
        </div>
        <div>
          <dt>Propiedades activas</dt>
          <dd>{datos.propiedadesActivas} de {datos.limitePropiedades}</dd>
        </div>
        <div>
          <dt>Cupos de usuarios ocupados</dt>
          <dd>{datos.cuposUsuariosOcupados} de {datos.limiteUsuarios}</dd>
          <dd className="hf-suscripcion__detalle">
            {datos.usuariosActivos} {datos.usuariosActivos === 1 ? 'usuario activo' : 'usuarios activos'} ·{' '}
            {datos.invitacionesPendientes} {datos.invitacionesPendientes === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ConsultaSuscripcion({ api }) {
  const titulo = useId();
  const [listado, setListado] = useState(null);
  const [seleccion, setSeleccion] = useState('');

  useEffect(() => {
    const solicitud = new AbortController();
    listarEmpresasSuscripcion(api, solicitud.signal).then(
      empresas => {
        if (solicitud.signal.aborted) return;
        setSeleccion(empresas.length === 1 ? String(empresas[0].idEmpresa) : '');
        setListado({ api, empresas });
      },
      error => { if (!solicitud.signal.aborted) setListado({ api, error: mensajeError(error) }); },
    );
    return () => solicitud.abort();
  }, [api]);

  const vigente = listado?.api === api ? listado : null;
  const empresas = vigente?.empresas ?? [];
  const empresa = empresas.find(item => String(item.idEmpresa) === seleccion);

  return (
    <section className="hf-suscripcion" aria-labelledby={titulo}>
      <h2 id={titulo}>Plan y consumo</h2>
      {!vigente && <p role="status">Comprobando las empresas habilitadas…</p>}
      {vigente?.error && <p role="alert">{vigente.error}</p>}
      {vigente?.empresas?.length === 0 && <p role="status">Tu sesión no tiene empresas habilitadas.</p>}
      {empresas.length > 1 && (
        <label className="hf-suscripcion__selector">
          Empresa
          <select value={seleccion} onChange={evento => setSeleccion(evento.target.value)}>
            <option value="">Elegí una empresa</option>
            {empresas.map(item => <option key={item.idEmpresa} value={item.idEmpresa}>{item.nombre}</option>)}
          </select>
        </label>
      )}
      {empresa && <ConsumoEmpresa key={empresa.idEmpresa} api={api} empresa={empresa} />}
    </section>
  );
}

// Recibe el usuario ya validado por el host. El backend autoriza cada consulta y membresía.
export default function ResumenSuscripcion({ usuario, apiAutenticada }) {
  if (!apiAutenticada || !Number.isSafeInteger(usuario?.idUsuario) || usuario.idUsuario <= 0 ||
      usuario.debeCambiarPassword !== false || !['Administrador', 'Operador'].includes(usuario.rol)) {
    return null;
  }
  return (
    <ConsultaSuscripcion
      key={JSON.stringify([usuario.idUsuario, usuario.rol, usuario.versionRegistro])}
      api={apiAutenticada}
    />
  );
}
