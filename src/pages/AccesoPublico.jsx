import { useEffect } from 'react';
import ClienteLayout from '../components/ClienteLayout';

export default function AccesoPublico() {
  useEffect(() => { document.title = 'Iniciar sesión | HostFlow'; }, []);

  return (
    <ClienteLayout titulo="titulo-acceso-publico">
      <h1 id="titulo-acceso-publico">Iniciar sesión</h1>
      <p>Elegí el acceso que corresponde a tu cuenta.</p>
      <div className="hf-cliente__opciones">
        <a href="/clientes/login"><strong>Cuenta de cliente</strong><span>Consultá el estado de tu cuenta o de tu espacio.</span></a>
        <a href="/login"><strong>Equipo y administración</strong><span>Ingresá al panel operativo de tu empresa.</span></a>
      </div>
      <p className="hf-cliente__pie">¿Todavía no tenés cuenta? <a href="/clientes/registro">Consultar disponibilidad de registro</a></p>
    </ClienteLayout>
  );
}
