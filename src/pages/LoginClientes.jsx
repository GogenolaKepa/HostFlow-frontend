import { useEffect, useRef, useState } from 'react';
import { resolverBaseApi } from '../services/configuracionApiPublica';
import { crearClienteRegistro } from '../services/registroClientes';
import '../styles/login-premium.css';
import '../styles/registro-clientes.css';

function conectar() {
  try {
    return crearClienteRegistro({
      apiBase: resolverBaseApi({ env: import.meta.env, ubicacion: window.location }), desarrollo: import.meta.env.DEV,
    });
  } catch { return null; }
}

const MENSAJES = {
  CREDENCIALES_INVALIDAS: 'Revisá el correo y la contraseña.',
  LIMITE_SOLICITUDES: 'Esperá unos minutos antes de volver a intentar.',
};

export default function LoginClientes() {
  const [cliente] = useState(conectar);
  const [estado, setEstado] = useState(cliente ? 'cargando' : 'no-disponible');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const bloqueo = useRef(false);

  useEffect(() => {
    document.title = 'Acceso de clientes | HostFlow';
    if (!cliente) return;
    let activo = true;
    cliente.consultarSesion().then(
      sesion => { if (activo) setEstado(sesion || 'login'); },
      () => { if (activo) setEstado('no-disponible'); },
    );
    return () => { activo = false; };
  }, [cliente]);

  async function ejecutar(evento, cerrar = false) {
    evento.preventDefault();
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError('');
    const campos = evento.currentTarget.elements;
    const password = campos?.namedItem('password');
    try {
      if (cerrar) {
        await cliente.cerrarSesion();
        setEstado('login');
      } else {
        await cliente.iniciarSesion(campos.email.value, password.value);
        const sesion = await cliente.consultarSesion();
        setEstado(sesion || 'login');
        if (!sesion) setError('No pudimos comprobar que el navegador conserve la sesión.');
      }
    } catch (fallo) {
      setError(Object.hasOwn(MENSAJES, fallo.codigo) ? MENSAJES[fallo.codigo] :
        cerrar ? 'No pudimos confirmar el cierre. Volvé a intentar.' : 'No pudimos confirmar el acceso. Volvé a intentar.');
    } finally {
      if (password) password.value = '';
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  const pendiente = estado === 'pendiente-activacion';
  return (
    <main className="login-container login-premium registro-clientes registro-acceso">
      <div className="login-contenido">
        <section className="login-card registro-card" aria-labelledby="titulo-acceso-cliente" aria-busy={ocupado || estado === 'cargando'}>
          <h1 id="titulo-acceso-cliente">{pendiente ? 'Tu cuenta está pendiente de activación' : 'Acceso de clientes'}</h1>
          {estado === 'cargando' && <p role="status">Comprobando tu sesión…</p>}
          {estado === 'no-disponible' && <p role="alert">El acceso de clientes no está disponible en este momento.</p>}
          {error && <p className="registro-error" role="alert">{error}</p>}
          {estado === 'login' && <form method="post" onSubmit={ejecutar}>
            <fieldset disabled={ocupado}>
              <label htmlFor="cliente-email">Correo electrónico</label>
              <input id="cliente-email" name="email" type="email" autoComplete="username" maxLength={254} required />
              <label htmlFor="cliente-password">Contraseña</label>
              <input id="cliente-password" name="password" type="password" autoComplete="current-password" required />
              <button type="submit">Ingresar</button>
            </fieldset>
          </form>}
          {pendiente && <>
            <p role="status">Tu correo está verificado. Podés consultar este estado hasta que se habilite tu espacio.</p>
            <button type="button" disabled={ocupado} onClick={evento => ejecutar(evento, true)}>Cerrar sesión</button>
          </>}
        </section>
      </div>
    </main>
  );
}
