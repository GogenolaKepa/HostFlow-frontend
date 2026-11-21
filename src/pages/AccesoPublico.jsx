import { useEffect } from 'react';
import CabeceraPublica from '../components/CabeceraPublica';
import ClienteLayout from '../components/ClienteLayout';
import '../styles/entrada-publica.css';

export default function AccesoPublico() {
  useEffect(() => { document.title = 'Iniciar sesión | HostFlow'; }, []);

  return (
    <ClienteLayout cabecera={<CabeceraPublica pantalla="acceso" />} titulo="titulo-acceso-publico">
      <h1 id="titulo-acceso-publico">Iniciar sesión</h1>
      <p>Elegí el acceso que corresponde a tu cuenta.</p>
      <div className="hf-cliente__opciones">
        <a href="/clientes/login">
          <strong>Ya me registré en HostFlow</strong>
          <span>Ingresá con la cuenta que creaste para consultar el estado de activación de tu espacio.</span>
          <span className="hf-entrada-publica__flecha" aria-hidden="true">→</span>
        </a>
        <a href="/login">
          <strong>Entrar a mi panel de gestión</strong>
          <span>Si ya tenés acceso a una empresa en HostFlow, ingresá para administrar tus alojamientos y reservas.</span>
          <span className="hf-entrada-publica__flecha" aria-hidden="true">→</span>
        </a>
      </div>
    </ClienteLayout>
  );
}
