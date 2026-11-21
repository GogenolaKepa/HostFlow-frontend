import MarcaHostFlow from './MarcaHostFlow';
import '../styles/registro-clientes.css';

export default function ClienteLayout({ children, amplio = false, titulo, ocupado = false, cabecera }) {
  return (
    <div className={cabecera ? "hf-cliente hf-entrada-publica" : "hf-cliente"}>
      {cabecera ?? <header className="hf-cliente__cabecera">
        <a href="/" aria-label="HostFlow, inicio público"><MarcaHostFlow /></a>
        <nav aria-label="Acceso público">
          <a href="/#planes">Planes</a>
          <a href="/acceso">Iniciar sesión</a>
        </nav>
      </header>}
      <main className={`hf-cliente__layout${amplio ? ' hf-cliente__layout--amplio' : ''}`}>
        {cabecera && <div className="hf-entrada-publica__fondo" aria-hidden="true" />}
        <section className="registro-card" aria-labelledby={titulo} aria-busy={ocupado}>
          {children}
        </section>
        {!cabecera && <div className="hf-cliente__foto" aria-hidden="true" />}
      </main>
    </div>
  );
}

export function EstadoCliente({ tipo = 'info', children }) {
  return (
    <div className={`hf-cliente__estado hf-cliente__estado--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {tipo === 'cargando' && <span className="hf-cliente__cargando" aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}
