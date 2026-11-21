import { useEffect, useRef, useState } from 'react';
import { useFondoLogin } from '../hooks/useFondoLogin';
import { validarPasswordNueva } from '../services/cuentas';
import { resolverBaseApi } from '../services/configuracionApiPublica';
import { crearClienteRegistro } from '../services/registroClientes';
import '../styles/login-premium.css';
import '../styles/registro-clientes.css';

const MENSAJES = {
  invalido: 'Este enlace no es válido. Volvé a abrir el enlace original desde tu correo.',
  vencido: 'Este enlace venció, ya fue utilizado o no es válido.',
  'no-disponible': 'No pudimos comprobar el enlace. Volvé a abrirlo desde tu correo más tarde.',
};

function conectarVerificacion() {
  try {
    const apiBase = resolverBaseApi({ env: import.meta.env, ubicacion: window.location });
    return crearClienteRegistro({ apiBase, desarrollo: import.meta.env.DEV });
  } catch {
    return null;
  }
}

function mensajeConfirmacion(error) {
  if (error.incierto) return 'No pudimos confirmar el resultado. El envío quedó bloqueado para evitar repetirlo.';
  switch (error.codigo) {
    case 'ENLACE_NO_VALIDO':
      return 'Este enlace venció, ya fue utilizado o no corresponde a esa contraseña.';
    case 'CSRF_INVALIDO':
      return 'La protección de esta página venció. Volvé a abrir el enlace desde tu correo.';
    case 'LIMITE_SOLICITUDES':
      return 'Llegaste al límite de solicitudes. Esperá antes de volver a intentarlo.';
    default:
      return 'No pudimos verificar tu correo. Volvé a intentarlo.';
  }
}

export default function VerificarCorreoClientes({ token }) {
  const [cliente] = useState(conectarVerificacion);
  const [estado, setEstado] = useState(() => !token ? 'invalido' : cliente ? 'cargando' : 'no-disponible');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const consulta = useRef(null);
  const bloqueo = useRef(false);
  const fondo = useFondoLogin();

  useEffect(() => {
    document.title = 'Verificá tu correo | HostFlow';
    if (!token || !cliente) return;

    let activo = true;
    // React puede ejecutar el efecto dos veces en desarrollo. El estado de un enlace consume cuota.
    consulta.current ??= cliente.estadoVerificacion(token);
    consulta.current.then(
      vigente => { if (activo) setEstado(vigente ? 'vigente' : 'vencido'); },
      () => { if (activo) setEstado('no-disponible'); },
    );
    return () => { activo = false; };
  }, [cliente, token]);

  async function confirmar(evento) {
    evento.preventDefault();
    if (estado !== 'vigente' || bloqueo.current || !evento.currentTarget.reportValidity()) return;

    const input = evento.currentTarget.elements.namedItem('verificacion-password');
    const password = input.value;
    const errorValidacion = validarPasswordNueva(password, password);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    bloqueo.current = true;
    setEnviando(true);
    setError('');
    try {
      await cliente.confirmarVerificacion({ token, password });
      setEstado('verificado');
    } catch (fallo) {
      setError(mensajeConfirmacion(fallo));
      if (fallo.incierto || fallo.codigo === 'CSRF_INVALIDO') setEstado('bloqueado');
      else bloqueo.current = false;
    } finally {
      input.value = '';
      setEnviando(false);
    }
  }

  return (
    <main className="login-container login-premium registro-clientes" data-fondo={fondo.estado}>
      <div className="login-hero" aria-hidden="true" style={fondo.url ? { backgroundImage: `url("${fondo.url}")` } : undefined} />
      <div className="login-contenido">
        <div className="login-info">
          <div className="identidad-login">
            <img src="/brand/isotipo.svg" width="52" height="85" alt="" />
            <p className="marca nombre-login">Host<span>Flow</span></p>
          </div>
        </div>
        <section className="login-card registro-card" aria-labelledby="titulo-verificacion" aria-busy={estado === 'cargando' || enviando}>
          <h1 id="titulo-verificacion">{estado === 'verificado' ? 'Correo verificado' : 'Verificá tu correo'}</h1>
          {estado === 'cargando' && <p role="status">Comprobando tu enlace…</p>}
          {MENSAJES[estado] && <p className="registro-error" role="alert">{MENSAJES[estado]}</p>}
          {estado === 'verificado' && <><p role="status">Tu cuenta fue creada.</p><a href="/clientes/login">Ingresá a tu cuenta de cliente</a></>}
          {error && <p className="registro-error" role="alert">{error}</p>}
          {(estado === 'vigente' || estado === 'bloqueado') && (
            <form method="post" onSubmit={confirmar}>
              <fieldset disabled={enviando || estado === 'bloqueado'}>
                <label htmlFor="verificacion-password">Contraseña elegida al registrarte</label>
                <input id="verificacion-password" type="password" autoComplete="current-password" required />
                <button type="submit">{enviando ? 'Confirmando…' : 'Confirmá tu correo'}</button>
              </fieldset>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
