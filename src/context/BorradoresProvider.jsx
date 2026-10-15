import { useEffect, useState } from 'react';
import { crearProtectorBorradores } from '../services/borradores';
import { SecurityDialog } from '../components/security/SecurityUI';
import { BorradoresContext } from './BorradoresContext';

export function BorradoresProvider({ children }) {
  const [estado, setEstado] = useState({ pendiente: false, ocupado: false, tieneCambios: false });
  const [protector] = useState(() => crearProtectorBorradores(setEstado));
  useEffect(() => {
    const avisar = event => {
      const actual = protector.estado();
      if (!actual.tieneCambios && !actual.ocupado) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [protector]);
  // Expiración/revocación desmontan este árbol desde App: no pasan por solicitar.
  return <BorradoresContext.Provider value={{ protector, ocupado: estado.ocupado }}>
    {children}
    {estado.pendiente && <div className="settings-guard">
      <SecurityDialog compact title="Cambios sin guardar" description="Si continuás, se descartarán las modificaciones que todavía no guardaste. Los datos guardados no se modifican." busy={estado.ocupado} onClose={protector.cancelar}>
        <footer className="security-dialog-actions">
          <button className="settings-button" type="button" disabled={estado.ocupado} onClick={protector.cancelar}>Seguir editando</button>
          <button className="settings-button settings-button--primary" type="button" disabled={estado.ocupado} onClick={protector.confirmar}>Descartar y continuar</button>
        </footer>
      </SecurityDialog>
    </div>}
  </BorradoresContext.Provider>;
}
