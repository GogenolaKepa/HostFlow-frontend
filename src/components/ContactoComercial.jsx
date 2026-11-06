import {useState} from 'react';
import {planes, prepararCorreoComercial} from '../services/catalogoComercial';

export default function ContactoComercial({plan, setPlan, ciclo, setCiclo}) {
  const [preparado, setPreparado] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const vigente = preparado?.plan === plan && preparado?.ciclo === ciclo;

  function limpiar() {
    setPreparado(null);
    setError('');
    setAviso('');
  }

  function preparar(evento) {
    evento.preventDefault();
    setError('');
    setAviso('');
    const campos = new FormData(evento.currentTarget);
    try {
      const correo = prepararCorreoComercial({
        nombre: campos.get('nombre'),
        correo: campos.get('correo'),
        empresa: campos.get('empresa'),
        alojamientos: campos.get('alojamientos'),
        plan,
        periodicidad: ciclo,
        mensaje: campos.get('mensaje'),
        consentimiento: campos.get('consentimiento') === 'on',
      });
      setPreparado({...correo, plan, ciclo});
    } catch (fallo) {
      setPreparado(null);
      setError(fallo.message);
    }
  }

  async function copiar() {
    if (!vigente) return;
    try {
      if (!navigator.clipboard?.writeText) throw Error();
      await navigator.clipboard.writeText(preparado.mensaje);
      setAviso('Mensaje copiado. Todavía no se envió.');
    } catch {
      setAviso('Seleccioná y copiá el mensaje de abajo para compartirlo.');
    }
  }
  return <section id="contacto" className="contacto ancho" aria-labelledby="contacto-titulo">
    <div className="contacto-presentacion"><span className="ceja">CONVERSEMOS SOBRE TU GESTIÓN</span><h2 id="contacto-titulo">Tu gestión puede<br/>verse más clara.</h2><p>Contanos sobre tus alojamientos y lo que necesitás organizar. Prepará una consulta para coordinar el alcance y tu incorporación.</p>
      <ul className="contacto-pasos"><li><span>01</span>Elegí un plan y una periodicidad de interés.</li><li><span>02</span>Compartí el contexto de tu operación.</li><li><span>03</span>Prepará un correo para conversar sobre tu propuesta.</li></ul>
      <div className="canal-contacto"><strong>contacto@hostflow.com.ar</strong><span>Canal comercial · Recepción de correos habilitada</span><p>La página prepara el mensaje en tu navegador. No lo envía ni confirma su recepción.</p></div>
    </div>
    <form className="formulario" onSubmit={preparar} onChange={limpiar}>
      <h3>Solicitar información</h3><p>Los campos marcados con * son obligatorios.</p>
      <div className="dos-campos"><label>Nombre *<input name="nombre" required minLength={2} maxLength={100} autoComplete="name" placeholder="Tu nombre"/></label><label>Correo electrónico *<input name="correo" type="email" required maxLength={254} autoComplete="email" placeholder="tu@empresa.com"/></label></div>
      <div className="dos-campos"><label>Empresa / equipo <small>opcional</small><input name="empresa" maxLength={120} autoComplete="organization" placeholder="Nombre de tu equipo"/></label><label>Alojamientos estimados <small>opcional</small><input id="hf-alojamientos" name="alojamientos" type="number" min="1" max="99999" step="1" placeholder="Cantidad aproximada"/></label></div>
      <div className="dos-campos"><label>Plan de interés *<select name="plan" value={plan} onChange={evento=>setPlan(evento.target.value)}>{planes.map(opcion=><option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}</select></label><label>Periodicidad *<select name="periodicidad" value={ciclo} onChange={evento=>setCiclo(evento.target.value)}><option value="mensual">Mensual</option><option value="anual">Anual</option></select></label></div>
      <label>¿Qué te gustaría organizar mejor? *<textarea name="mensaje" required minLength={10} maxLength={2000} rows={4} placeholder="Contanos sobre tu operación y tus necesidades."/></label>
      <label className="consentimiento"><input type="checkbox" name="consentimiento" required/><span>Autorizo el uso de estos datos para responder esta consulta. Sin suscripción a mensajes de marketing.</span></label>
      <button type="submit" className="boton primario">Preparar correo<span aria-hidden="true">→</span></button>
      {error&&<p className="contacto-estado contacto-error" role="alert">{error}</p>}
      {vigente&&<div className="correo-preparado"><p className="contacto-estado" role="status">Mensaje preparado, sin enviar. Podés abrir tu aplicación de correo o copiarlo para compartirlo con tu contacto de HostFlow.</p><label htmlFor="hf-solicitud">Tu mensaje<textarea id="hf-solicitud" readOnly rows={8} value={preparado.mensaje}/></label><div className="acciones"><a className="boton primario" href={preparado.href}>Abrir mi aplicación de correo ↗</a><button className="boton secundario" type="button" onClick={copiar}>Copiar mensaje</button></div><p className="contacto-estado" role="status">{aviso}</p></div>}
    </form>
  </section>;
}
