import { useEffect, useId, useState } from 'react';
import { consultarSuscripcionEmpresa, listarEmpresasSuscripcion } from '../../services/consultaSuscripcion.js';
import { planes, precioPlan } from '../../services/catalogoComercial.js';
import { Trazo } from '../CargaPagina';
import { SecurityIcon } from '../security/SecurityUI';
import './consulta-suscripcion.css';

const mensajeError = error => {
  if ([401, 403].includes(error.response?.status)) return 'Tu sesión no tiene acceso a esta consulta.';
  if (error.codigo === 'CONSULTA_NO_DISPONIBLE' || error.response?.status === 404) {
    return 'La consulta de suscripción no está disponible.';
  }
  return 'No pudimos verificar el plan y el consumo.';
};

function CargaConsumo({ detalle }) {
  return <div className="hf-skeleton hf-suscripcion__carga" role="status" aria-busy="true">
    <span className="hf-skeleton-etiqueta">Consultando plan y consumo…</span>
    <div className="hf-skeleton-visual" aria-hidden="true">
      <Trazo ancho="min(60%, 16rem)" />
      <div className="hf-suscripcion__grilla">
        {[0, 1, 2].map(indice => <div className="hf-suscripcion__tarjeta" key={indice}>
          <Trazo ancho="68%" alto=".85rem" /><Trazo ancho="42%" alto="1.5rem" />
          <Trazo ancho={indice ? '100%' : '55%'} alto={indice ? '.45rem' : '.85rem'} />
        </div>)}
      </div>
      {detalle && <>
        <div className="hf-suscripcion__comparativa-cabecera">
          <Trazo ancho="11rem" alto="1.35rem" /><Trazo ancho="10rem" alto="2.5rem" />
        </div>
        <div className="hf-suscripcion__grilla">
          {[0, 1, 2].map(indice => <div className="hf-suscripcion__tarjeta" key={indice}>
            <Trazo ancho="66%" /><Trazo ancho="54%" alto="1.5rem" /><Trazo ancho="80%" /><Trazo ancho="58%" />
          </div>)}
        </div>
      </>}
    </div>
  </div>;
}

function BarraConsumo({ titulo, usados, limite }) {
  return <progress className="hf-suscripcion__barra" max={limite} value={Math.min(usados, limite)}
    data-exceso={usados > limite || undefined} aria-label={titulo} aria-valuetext={`${usados} de ${limite}`} />;
}

function Comparativa({ codigoActual, cicloActual }) {
  const [ciclo, setCiclo] = useState(cicloActual);
  const grupo = useId();
  return <section className="hf-suscripcion__comparativa" aria-labelledby={`${grupo}-comparativa`}>
    <div className="hf-suscripcion__comparativa-cabecera">
      <h3 id={`${grupo}-comparativa`}>Compará los planes</h3>
      <fieldset className="hf-suscripcion__ciclos">
        <legend className="hf-skeleton-etiqueta">Ciclo de la comparativa</legend>
        {['mensual', 'anual'].map(item => <label key={item}>
          <input type="radio" name={grupo} value={item} checked={item === ciclo} onChange={() => setCiclo(item)} />
          <span>{item === 'mensual' ? 'Mensual' : 'Anual'}</span>
        </label>)}
      </fieldset>
    </div>
    <div className="hf-suscripcion__grilla">
      {planes.map(plan => <div className="hf-suscripcion__tarjeta hf-suscripcion__plan" data-plan={plan.id}
        data-actual={plan.id === codigoActual || undefined} key={plan.id}>
        <h4>{plan.nombre}</h4>
        {plan.id === codigoActual && <span className="hf-suscripcion__badge">Tu plan actual</span>}
        <p className="hf-suscripcion__precio">{precioPlan(plan, ciclo)} <small>/ {ciclo === 'anual' ? 'año' : 'mes'}</small></p>
        <ul><li>{plan.propiedades} propiedades</li><li>{plan.usuarios} {plan.usuarios === 1 ? 'usuario' : 'usuarios'}</li></ul>
      </div>)}
    </div>
    <p className="hf-suscripcion__nota">Comparación informativa. Los cambios de suscripción requieren gestión administrativa.</p>
  </section>;
}

function ConsumoEmpresa({ api, empresa, detalle }) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const solicitud = new AbortController();
    consultarSuscripcionEmpresa(api, empresa.idEmpresa, solicitud.signal).then(
      datos => { if (!solicitud.signal.aborted) setResultado({ api, datos }); },
      error => {
        if (solicitud.signal.aborted) return;
        if (error.response?.status === 404 && error.response.data?.codigo === 'SUSCRIPCION_NO_DISPONIBLE') {
          setResultado({ api, sinSuscripcion: true });
        } else setResultado({ api, error: mensajeError(error) });
      },
    );
    return () => solicitud.abort();
  }, [api, empresa.idEmpresa]);

  if (resultado?.api !== api) return <CargaConsumo detalle={detalle} />;
  if (resultado.error) return <p className="hf-suscripcion__mensaje" role="alert">{resultado.error}</p>;
  if (resultado.sinSuscripcion) return <>
    <p className="hf-suscripcion__mensaje" role="status">{empresa.nombre} no tiene una suscripción vigente.</p>
    {detalle && <Comparativa cicloActual="mensual" />}
  </>;

  const datos = resultado.datos;
  return (
    <><div className="hf-suscripcion__consumo">
      <p className="hf-suscripcion__empresa">{empresa.nombre}</p>
      <dl className="hf-suscripcion__grilla">
        <div className="hf-suscripcion__tarjeta">
          <dt>Plan actual</dt>
          <dd>{datos.nombrePlan}</dd>
          <dd className="hf-suscripcion__detalle">
            Ciclo {datos.ciclo.toLowerCase()}
            {detalle && <span className="hf-suscripcion__badge hf-suscripcion__badge--activa">Activa</span>}
          </dd>
        </div>
        <div className="hf-suscripcion__tarjeta">
          <dt>Propiedades activas</dt>
          <dd>{datos.propiedadesActivas} de {datos.limitePropiedades}</dd>
          <dd><BarraConsumo titulo="Propiedades activas" usados={datos.propiedadesActivas} limite={datos.limitePropiedades} /></dd>
        </div>
        <div className="hf-suscripcion__tarjeta">
          <dt>Cupos de usuarios ocupados</dt>
          <dd>{datos.cuposUsuariosOcupados} de {datos.limiteUsuarios}</dd>
          <dd><BarraConsumo titulo="Cupos de usuarios ocupados" usados={datos.cuposUsuariosOcupados} limite={datos.limiteUsuarios} /></dd>
          <dd className="hf-suscripcion__detalle">
            {datos.usuariosActivos} {datos.usuariosActivos === 1 ? 'usuario activo' : 'usuarios activos'} ·{' '}
            {datos.invitacionesPendientes} {datos.invitacionesPendientes === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}
          </dd>
        </div>
      </dl>
    </div>
    {detalle && <Comparativa codigoActual={datos.codigoPlan} cicloActual={datos.ciclo.toLowerCase()} />}
    </>
  );
}

function ConsultaSuscripcion({ api, detalle, onVerPlan }) {
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
      <div className="hf-suscripcion__cabecera">
        <span className="hf-suscripcion__icono"><SecurityIcon name="building" /></span>
        <h2 id={titulo}>{detalle ? 'Mi plan' : 'Plan y consumo'}</h2>
        {onVerPlan && <a className="hf-suscripcion__enlace" href="/configuracion/mi-plan" onClick={evento => {
          if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
          evento.preventDefault();
          onVerPlan();
        }}>Ver mi plan <SecurityIcon name="right" /></a>}
      </div>
      {!vigente && <CargaConsumo detalle={detalle} />}
      {vigente?.error && <p className="hf-suscripcion__mensaje" role="alert">{vigente.error}</p>}
      {vigente?.empresas?.length === 0 && <p className="hf-suscripcion__mensaje" role="status">Tu sesión no tiene empresas habilitadas.</p>}
      {empresas.length > 1 && (
        <label className="hf-suscripcion__selector">
          Empresa
          <select value={seleccion} onChange={evento => setSeleccion(evento.target.value)}>
            <option value="">Elegí una empresa</option>
            {empresas.map(item => <option key={item.idEmpresa} value={item.idEmpresa}>{item.nombre}</option>)}
          </select>
        </label>
      )}
      {empresa && <ConsumoEmpresa key={empresa.idEmpresa} api={api} empresa={empresa} detalle={detalle} />}
    </section>
  );
}

// Recibe el usuario ya validado por el host. El backend autoriza cada consulta y membresía.
export default function ResumenSuscripcion({ usuario, apiAutenticada, detalle = false, onVerPlan }) {
  if (!apiAutenticada || !Number.isSafeInteger(usuario?.idUsuario) || usuario.idUsuario <= 0 ||
      usuario.debeCambiarPassword !== false || !['Administrador', 'Operador'].includes(usuario.rol)) {
    return null;
  }
  return (
    <ConsultaSuscripcion
      key={JSON.stringify([usuario.idUsuario, usuario.rol, usuario.versionRegistro])}
      api={apiAutenticada}
      detalle={detalle}
      onVerPlan={onVerPlan}
    />
  );
}
