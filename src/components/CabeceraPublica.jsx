import MarcaHostFlow from './MarcaHostFlow';
import '../styles/cabecera-publica.css';

export default function CabeceraPublica({ pantalla }) {
  const landing = pantalla === 'landing';

  return (
    <header className={landing ? 'hf-publica-cabecera hf-publica-cabecera--landing' : 'hf-publica-cabecera'}>
      <div className="hf-publica-cabecera__interior">
        <a href="/" aria-label="HostFlow, inicio público"><MarcaHostFlow /></a>
        <nav aria-label="Navegación pública">
          {landing ? (
            <>
              <a className="hf-publica-cabecera__producto" href="#funciones">El producto</a>
              <a href="/acceso">Iniciar sesión</a>
            </>
          ) : (
            <>
              <a href="/#planes">Planes</a>
              {pantalla !== 'registro' && <a className="hf-publica-cabecera__principal" href="/clientes/registro">Registrarse</a>}
              {pantalla !== 'acceso' && <a className="hf-publica-cabecera__principal" href="/acceso">Iniciar sesión</a>}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
