import { useEffect, useRef, useState } from 'react';
import { SecurityDialog } from '../components/security/SecurityUI';

// La apertura nunca ejecuta la acción. La confirmación bloquea dobles clics
// de forma síncrona, antes del siguiente render de React.
export function useConfirmarOperacion() {
  const [opcion, setOpcion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const bloqueo = useRef(false), montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  const solicitar = datos => {
    if (bloqueo.current) return;
    setError(''); setOpcion(datos);
  };
  const ejecutar = async () => {
    if (bloqueo.current || !opcion) return;
    bloqueo.current = true; setOcupado(true);
    try { await opcion.ejecutar(); }
    catch { if (montado.current) setError('No se pudo comprobar el resultado. Recargá los datos antes de reintentar.'); }
    finally {
      bloqueo.current = false;
      if (montado.current) { setOcupado(false); setOpcion(null); }
    }
  };
  return { solicitar, ocupado, dialogo: <>
    {error && <p role="alert">{error}</p>}
    {opcion && <SecurityDialog title={opcion.titulo} description={opcion.descripcion}
      onClose={() => { if (!bloqueo.current) setOpcion(null); }} busy={ocupado} compact>
      <footer className="security-dialog-actions">
        <button type="button" className="secondary-button" disabled={ocupado} onClick={() => setOpcion(null)}>Cancelar</button>
        <button type="button" className="primary-button" disabled={ocupado} onClick={ejecutar}>{ocupado ? 'Procesando…' : 'Confirmar operación'}</button>
      </footer>
    </SecurityDialog>}
  </> };
}
