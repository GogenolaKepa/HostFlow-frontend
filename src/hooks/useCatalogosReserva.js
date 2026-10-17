import { useEffect, useState } from 'react';
import api from '../services/api';
import { leerCatalogoReserva } from '../services/formularioReserva';

const inicial = () => ({ items: [], cargando: true, error: '' });
export default function useCatalogosReserva(abierto) {
  const [catalogos, setCatalogos] = useState(() => ({ propiedades: inicial(), huespedes: inicial() }));
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!abierto) return;
    const controller = new AbortController();
    setCatalogos({ propiedades: inicial(), huespedes: inicial() });
    for (const tipo of ['propiedades', 'huespedes']) {
      api.get(`/${tipo}`, { signal: controller.signal }).then(respuesta => {
        const items = leerCatalogoReserva(respuesta, tipo);
        if (!controller.signal.aborted) setCatalogos(actual => ({ ...actual, [tipo]: { items, cargando: false, error: '' } }));
      }).catch(() => {
        if (!controller.signal.aborted) setCatalogos(actual => ({ ...actual, [tipo]: {
          items: [], cargando: false, error: `No se pudieron cargar ${tipo === 'propiedades' ? 'las propiedades' : 'los huéspedes'}.` } }));
      });
    }
    return () => controller.abort();
  }, [abierto, intento]);
  return { ...catalogos, recargar: () => setIntento(actual => actual + 1) };
}
