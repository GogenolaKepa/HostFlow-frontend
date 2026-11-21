import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SelectorPlanes from '../components/suscripciones/SelectorPlanes';
import CabeceraPublica from '../components/CabeceraPublica';
import ClienteLayout, { EstadoCliente } from '../components/ClienteLayout';
import CampoPassword from '../components/autenticacion/CampoPassword';
import { validarPasswordNueva } from '../services/cuentas';
import { resolverBaseApi } from '../services/configuracionApiPublica';
import { crearClienteRegistro, mensajeErrorRegistro } from '../services/registroClientes';
import { ciclosParaSeleccion, planesParaSeleccion } from '../services/seleccionPlan';
import { precioPlan } from '../services/catalogoComercial';
import '../styles/entrada-publica.css';

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
    <ClienteLayout cabecera={<CabeceraPublica pantalla="registro" />} amplio={conSelector} titulo="titulo-registro" ocupado={estado === 'cargando' || enviando}>
          <h1 id="titulo-registro" ref={titulo} tabIndex={-1}>{conSelector ? 'Elegí tu plan' : encabezado}</h1>
          {estado === 'cargando' && <EstadoCliente tipo="cargando">Comprobando la disponibilidad del registro…</EstadoCliente>}
          {(estado === 'deshabilitado' || estado === 'no-disponible') && (
            <>
              {estado === 'deshabilitado' ? (
                <EstadoCliente>
                  <strong>Altas por invitación</strong>
                  El registro por correo todavía está en preparación.
                </EstadoCliente>
              ) : (
                <EstadoCliente tipo="error">
                  <strong>Registro temporalmente no disponible</strong>
                  No pudimos comprobar la disponibilidad del registro. Volvé a intentar más tarde.
                </EstadoCliente>
              )}
              <div className="hf-entrada-publica__acciones">
                <a className="hf-cliente__boton" href="/#planes">Conocer los planes</a>
                <a className="hf-cliente__boton hf-entrada-publica__secundaria" href="/acceso">Iniciar sesión</a>
              </div>
            </>
          )}
          {estado === 'enviado' && (
            <EstadoCliente tipo="exito">Si tu correo está habilitado, vas a recibir un enlace para verificarlo. Revisá también la carpeta de spam.</EstadoCliente>
          )}
          {error && <EstadoCliente tipo="error">{error}</EstadoCliente>}
          {conSelector && (
            <>
              <p>Compará los cupos y elegí la periodicidad para tu empresa.</p>
              <SelectorPlanes seleccionInicial={seleccion} onConfirmar={confirmarPlan} />
            </>
          )}
          {conFormulario && (
            <div hidden={conSelector}>
              <div className="registro-plan-elegido">
                <p><strong>{planElegido.nombre}</strong><span>{precioPlan(planElegido, seleccion.ciclo)} · {ciclosParaSeleccion[seleccion.ciclo]}</span></p>
                <button type="button" onClick={cambiarPlan} disabled={enviando || estado === 'bloqueado'}>
                  Cambiar plan y ciclo
                </button>
              </div>
              <p>Usá la dirección de tu invitación. Te enviaremos un enlace para verificarla.</p>
              <form aria-label="Registro por correo" method="post" onSubmit={enviar}>
                <fieldset disabled={conSelector || enviando || estado === 'bloqueado'}>
                  <label htmlFor="registro-nombre">Tu nombre</label>
                  <input id="registro-nombre" name="nombre" autoComplete="name" maxLength={120} required />

                  <label htmlFor="registro-email">Correo electrónico</label>
                  <input id="registro-email" name="email" type="email" autoComplete="email" maxLength={254}
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Ingresá un correo con dominio completo." required />

                  <CampoPassword id="registro-password" name={null} label="Contraseña" autoComplete="new-password"
                    aria-describedby="registro-password-ayuda" icono required />
                  <CampoPassword id="registro-repetir" name={null} label="Repetí la contraseña" autoComplete="new-password" icono required />
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
    </ClienteLayout>
  );
}
