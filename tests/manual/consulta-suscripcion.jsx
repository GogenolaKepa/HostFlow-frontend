import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import MarcaHostFlow from '../../src/components/MarcaHostFlow';
import ResumenSuscripcion from '../../src/components/suscripciones/ResumenSuscripcion';
import { crearApiSimulada } from '../fixtures/consultaSuscripcionSimulada.js';
import './consulta-suscripcion.css';

const sesiones = {
  admin: { idUsuario: 701, rol: 'Administrador', debeCambiarPassword: false },
  operador: { idUsuario: 702, rol: 'Operador', debeCambiarPassword: false },
};

export function SimuladorSuscripcion() {
  const [sesion, setSesion] = useState('');
  const usuario = sesiones[sesion];
  const api = useMemo(() => crearApiSimulada(usuario), [usuario]);

  return (
    <main>
      <header><MarcaHostFlow /></header>
      <h1>Consulta de suscripción</h1>
      <p>Vista local con sesiones, empresas y consumos ficticios.</p>
      <label className="sesion-simulada">
        Sesión ficticia
        <select value={sesion} onChange={evento => setSesion(evento.target.value)}>
          <option value="">Sin sesión</option>
          <option value="admin">Administrador</option>
          <option value="operador">Operador</option>
        </select>
      </label>
      <ResumenSuscripcion usuario={usuario} apiAutenticada={api} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<SimuladorSuscripcion />);
