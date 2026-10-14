import { createContext, useCallback, useContext } from "react";

// El catálogo y los roles viven en backend. La UI utiliza la lista verificada
// por /auth/me; no deduce permisos del usuario guardado en localStorage.
export const PermisosContext = createContext([]);

export function usePermisos() {
  const permisos = useContext(PermisosContext);
  return useCallback((accion) => permisos.includes(accion), [permisos]);
}
