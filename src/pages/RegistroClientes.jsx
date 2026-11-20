import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SelectorPlanes from '../components/suscripciones/SelectorPlanes';
import { useFondoLogin } from '../hooks/useFondoLogin';
import { validarPasswordNueva } from '../services/cuentas';
import { resolverBaseApi } from '../services/configuracionApiPublica';
import { crearClienteRegistro, mensajeErrorRegistro } from '../services/registroClientes';
import { ciclosParaSeleccion, planesParaSeleccion } from '../services/seleccionPlan';
import '../styles/login-premium.css';
import '../styles/registro-clientes.css';

function conectarRegistro() {
  try {
    const apiBase = resolverBaseApi({ env: import.meta.env, ubicacion: window.location });
    return crearClienteRegistro({ apiBase, desarrollo: import.meta.env.DEV });
  } catch {
    return null;
  }
}

export default function RegistroClientes() {
  const [cliente] = useState(conectarRegistro);
  const [estado, setEstado] = useState(cliente ? 'cargando' : 'no-disponible');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [eligiendoPlan, setEligiendoPlan] = useState(true);
  const bloqueo = useRef(false);
  const titulo = useRef(null);
  const fondo = useFondoLogin();

  useEffect(() => {
    document.title = 'Creá tu cuenta | HostFlow';
    if (!cliente) return;

    let activo = true;
    cliente.registroHabilitado().then(
      habilitado => { if (activo) setEstado(habilitado ? 'habilitado' : 'deshabilitado'); },
      () => { if (activo) setEstado('no-disponible'); },
    );
    return () => { activo = false; };
  }, [cliente]);

  useLayoutEffect(() => {
    if (seleccion) titulo.current?.focus();
  }, [seleccion, eligiendoPlan]);

  function confirmarPlan(preferencia) {
    setSeleccion(preferencia);
    setEligiendoPlan(false);
  }

  function cambiarPlan() {
    setError('');
    setEligiendoPlan(true);
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (estado !== 'habilitado' || eligiendoPlan || !seleccion || bloqueo.current) return;

    const formulario = evento.currentTarget;
    if (!formulario.reportValidity()) return;

    const { nombre, email } = formulario.elements;
    const password = formulario.elements.namedItem('registro-password');
    const repetir = formulario.elements.namedItem('registro-repetir');
    const nombreLimpio = nombre.value.trim();
    const errorValidacion = !nombreLimpio
      ? 'Ingresá tu nombre.'
      : validarPasswordNueva(password.value, repetir.value);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    bloqueo.current = true;
    setEnviando(true);
    setError('');
    try {
      await cliente.registrar({
        nombre: nombreLimpio, email: email.value, password: password.value, ...seleccion,
      });
      setEstado('enviado');
    } catch (fallo) {
      if (fallo.codigo === 'REGISTRO_NO_HABILITADO') {
        setEstado('deshabilitado');
      } else {
        setError(mensajeErrorRegistro(fallo));
        if (fallo.incierto || fallo.codigo === 'CSRF_INVALIDO') setEstado('bloqueado');
        else bloqueo.current = false;
      }
    } finally {
      password.value = '';
      repetir.value = '';
      setEnviando(false);
    }
  }

  const conSelector = estado === 'habilitado' && eligiendoPlan;
  const conFormulario = seleccion && (estado === 'habilitado' || estado === 'bloqueado');
  const planElegido = planesParaSeleccion.find(plan => plan.id === seleccion?.plan);
  const encabezado = estado === 'enviado' ? 'Revisá tu correo' : 'Creá tu cuenta';

  return (
    <main className={`login-container login-premium registro-clientes${conSelector ? ' registro-clientes--planes' : ''}`} data-fondo={fondo.estado}>
      <div className="login-hero" aria-hidden="true" style={fondo.url ? { backgroundImage: `url("${fondo.url}")` } : undefined} />
      <div className="login-contenido">
        <div className="login-info">
          <div className="identidad-login">
            <img src="/brand/isotipo.svg" width="52" height="85" alt="" />
            <p className="marca nombre-login">Host<span>Flow</span></p>
          </div>
        </div>
        <section className={conSelector ? 'registro-card registro-card--planes' : 'login-card registro-card'}
          aria-labelledby="titulo-registro" aria-busy={estado === 'cargando' || enviando}>
          <h1 id="titulo-registro" ref={titulo} tabIndex={-1}>{conSelector ? 'Elegí tu plan' : encabezado}</h1>
          {estado === 'cargando' && <p role="status">Comprobando la disponibilidad del registro…</p>}
          {estado === 'deshabilitado' && <p role="status">El registro por correo todavía está en preparación.</p>}
          {estado === 'no-disponible' && <p role="alert">No pudimos comprobar la disponibilidad del registro. Volvé a ingresar más tarde.</p>}
          {estado === 'enviado' && (
            <p role="status">Si corresponde, recibirás un enlace para verificar tu correo. La cuenta se crea después de la verificación.</p>
          )}
          {error && <p className="registro-error" role="alert">{error}</p>}
          {conSelector && (
            <>
              <p>Elegí el plan y el ciclo que querés solicitar al crear tu cuenta.</p>
              <SelectorPlanes seleccionInicial={seleccion} onConfirmar={confirmarPlan} />
            </>
          )}
          {conFormulario && (
            <div hidden={conSelector}>
              <div className="registro-plan-elegido">
                <p><strong>{planElegido.nombre}</strong> · {ciclosParaSeleccion[seleccion.ciclo]}</p>
                <button type="button" onClick={cambiarPlan} disabled={enviando || estado === 'bloqueado'}>
                  Cambiar plan y ciclo
                </button>
              </div>
              <p className="login-intro">Acceso por invitación. Verificá tu correo para continuar.</p>
              <form aria-label="Registro por correo" method="post" onSubmit={enviar}>
                <fieldset disabled={conSelector || enviando || estado === 'bloqueado'}>
                  <label htmlFor="registro-nombre">Tu nombre</label>
                  <input id="registro-nombre" name="nombre" autoComplete="name" maxLength={120} required />

                  <label htmlFor="registro-email">Correo electrónico</label>
                  <input id="registro-email" name="email" type="email" autoComplete="email" maxLength={254}
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Ingresá un correo con dominio completo." required />

                  <label htmlFor="registro-password">Contraseña</label>
                  <input id="registro-password" type="password" autoComplete="new-password" aria-describedby="registro-password-ayuda" required />

                  <label htmlFor="registro-repetir">Repetí la contraseña</label>
                  <input id="registro-repetir" type="password" autoComplete="new-password" required />
                  <small id="registro-password-ayuda">Mínimo 12 caracteres, máximo 72 bytes. Usá una contraseña única.</small>

                  <label className="registro-consentimiento">
                    <input type="checkbox" required />
                    Comprendo que mi correo se usará para verificar y proteger mi cuenta.
                  </label>
                  <button type="submit">{enviando ? 'Enviando…' : 'Crear mi cuenta'}</button>
                </fieldset>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
