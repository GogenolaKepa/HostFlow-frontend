import {useEffect, useRef, useState} from 'react';
import {crearNavegacionSistema, resolverRutaSistema} from '../services/navegacionSistema';

export function useNavegacionSistema(usuario, protector) {
  const [ruta, setRuta] = useState(() => resolverRutaSistema(window.location.pathname, usuario));
  const navegador = useRef(null);
  useEffect(() => {
    const instancia = crearNavegacionSistema({ventana: window, usuario, protector, alCambiar: setRuta});
    navegador.current = instancia;
    return () => { instancia.cerrar(); navegador.current = null; };
  }, [usuario, protector]);
  useEffect(() => {
    document.title = ruta.titulo;
    document.querySelector('.dashboard > .main')?.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }, [ruta.url, ruta.titulo]);
  return {...ruta, navegar: (seccion, apartado) => navegador.current?.navegar(seccion, apartado)};
}
