import { planes, precioPlan, ahorroAnual, descuentoAnual, herramientas } from '../services/catalogoComercial';
import ModalidadesComparadas from './ModalidadesComparadas';


export default function Planes({ ciclo, setCiclo, elegir }) {
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
        <p className="facturacion-anual">12 meses por el precio de 11 mensualidades.<strong>{descuentoAnual} de ahorro aprox.</strong></p>
        <div className="tarjetas-plan">
          {planes.map(plan => (
            <div className="tarjeta-plan-area" key={plan.id}>
              <article className={'tarjeta-plan' + (plan.id === 'profesional' ? ' destacada' : '')}>
                <span className="plan-etiqueta">{plan.enfoque}</span>
                <h3>{plan.nombre}</h3>
                <p>{plan.descripcion}</p>
                <div className="precio"><strong>{precioPlan(plan, ciclo)}</strong><span>{ciclo === 'anual' ? 'Importe total por año' : 'Importe por mes'}</span><small>{ciclo === 'anual' ? `Ahorrás ${ahorroAnual(plan)} frente a 12 pagos mensuales` : 'Plan por empresa'}</small></div>
                <div className="alcance-plan">
                  <div><strong>{plan.propiedades}</strong><span>propiedades como máximo</span></div>
                  <div><strong>{plan.usuarios}</strong><span>{plan.usuarios === 1 ? 'usuario con acceso' : 'usuarios con acceso'}</span></div>
                </div>
                <h4>Herramientas contempladas</h4>
                <ul>{herramientas.map(texto => <li key={texto}><span aria-hidden="true">✓</span>{texto}</li>)}</ul>
                <a className={'boton ' + (plan.id === 'profesional' ? 'primario' : 'secundario')}
                  href="#contacto" onClick={() => elegir(plan.id)}>
                  Consultar {plan.nombre}<span aria-hidden="true">→</span>
                </a>
              </article>
            </div>
          ))}
        </div>
        <p className="aclaracion">Cada suscripción corresponde a una empresa. Los usuarios son personas con acceso al sistema, no huéspedes. El alcance comercial se confirma al coordinar la incorporación. Esta página no activa planes, registra empresas ni realiza cobros.</p>
        <p className="alcance-desarrollo">Invitaciones y recuperación por correo están pendientes de activación supervisada. Booking y Airbnb se recorren mediante simuladores, sin integración oficial ni sincronización productiva automática. Estas funcionalidades no se ofrecen como servicios activos en ningún plan.</p>
        <ModalidadesComparadas ciclo={ciclo} />
      </div>
    </section>
  );
}
