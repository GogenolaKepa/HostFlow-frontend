import { createContext, useContext, useLayoutEffect, useRef } from 'react';

export const BorradoresContext = createContext(null);

export function useProtectorBorradores() {
  const contexto = useContext(BorradoresContext);
  if (!contexto) throw Error('La navegación requiere BorradoresProvider.');
  return contexto;
}

export function useBorradorProtegido(modificado, ocupado) {
  const { protector } = useProtectorBorradores();
  const registro = useRef(null);
  useLayoutEffect(() => {
    registro.current = protector.registrar();
    return () => { registro.current.liberar(); registro.current = null; };
  }, [protector]);
  useLayoutEffect(() => { registro.current.actualizar(modificado, ocupado); }, [modificado, ocupado, protector]);
}
