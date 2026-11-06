import { planes, precioPlan, descuentoAnualPuntosBase, herramientas } from '../services/catalogoComercial';
import ModalidadesComparadas from './ModalidadesComparadas';


export default function Planes({ ciclo, setCiclo, elegir }) {
  const puntosBase = descuentoAnualPuntosBase(planes[0]);
  const descuento = Math.floor(puntosBase / 100) + ',' + String(puntosBase % 100).padStart(2, '0') + ' %';
  return (
    <section id="planes" className="planes-seccion" aria-labelledby="planes-titulo">
      <div className="ancho">
        <div className="titulo-seccion">
          <div>
            <span className="ceja">TRES PLANES, UNA GESTIÓN MÁS CLARA</span>
            <h2 id="planes-titulo">Una propuesta para<br />cada operación.</h2>
          </div>
          <p>Planes por empresa para distintas escalas de gestión. Elegí el alcance que te interesa y coordiná tu incorporación. La contratación se realiza de forma asistida.</p>
        </div>
        <fieldset className="periodos">
          <legend>Periodicidad de interés</legend>
          {['mensual', 'anual'].map(periodo => (
            <label className={periodo === ciclo ? 'activo' : ''} key={periodo}>
              <input type="radio" name="ciclo-plan" value={periodo} checked={periodo === ciclo}
                onChange={() => setCiclo(periodo)} />
              {periodo === 'mensual' ? 'Mensual' : 'Anual'}
            </label>
          ))}
        </fieldset>
        <p className="facturacion-anual">{ciclo === 'anual' ? 'Pago anual por adelantado. Pagás 11 mensualidades y recibís 12 meses de servicio.' : 'La modalidad anual contempla 12 meses de servicio por el precio de 11 mensualidades, con pago por adelantado.'}<strong>1 mes bonificado · Equivale al {descuento}</strong></p>
        <div className="tarjetas-plan">
          {planes.map(plan => (
            <article className={'tarjeta-plan' + (plan.id === 'profesional' ? ' destacada' : '')} key={plan.id}>
              <span className="plan-etiqueta">{plan.enfoque}</span>
              <h3>{plan.nombre}</h3>
              <p>{plan.descripcion}</p>
              <div className="precio"><strong>{precioPlan(plan, ciclo)}</strong><span>{ciclo === 'anual' ? 'Periodicidad anual · Pago por adelantado' : 'Periodicidad mensual · Importe por mes'}</span><small>{ciclo === 'anual' ? '12 meses de servicio · 1 mes bonificado' : 'Suscripción por empresa'}</small></div>
              <div className="alcance-plan">
                <div><strong>{plan.propiedades}</strong><span>hasta {plan.propiedades} propiedades</span></div>
                <div><strong>{plan.usuarios}</strong><span>{plan.usuarios === 1 ? 'usuario con acceso' : 'usuarios con acceso'}</span></div>
              </div>
              <h4>Herramientas contempladas</h4>
              <ul>{herramientas.map(texto => <li key={texto}><span aria-hidden="true">✓</span>{texto}</li>)}</ul>
              <a className={'boton ' + (plan.id === 'profesional' ? 'primario' : 'secundario')}
                href="#contacto" onClick={() => elegir(plan.id)}>
                Consultar {plan.nombre}<span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
        <p className="aclaracion">Cada suscripción corresponde a una empresa. Los usuarios son personas con acceso al sistema, no huéspedes. El alcance comercial se confirma al coordinar la incorporación. Esta página no activa planes, registra empresas ni realiza cobros.</p>
        <p className="alcance-desarrollo">Invitaciones y recuperación por correo están pendientes de activación supervisada. Booking y Airbnb se recorren mediante simuladores, sin integración oficial ni sincronización productiva automática. Estas funcionalidades no se ofrecen como servicios activos en ningún plan.</p>
        <ModalidadesComparadas ciclo={ciclo} />
      </div>
    </section>
  );
}
