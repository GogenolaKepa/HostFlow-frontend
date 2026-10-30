import { useEffect, useState } from 'react';
import hero from '../assets/login/hero.webp';
import heroMobile from '../assets/login/hero-mobile.webp';

// La fotografía es decorativa: nunca bloquea el formulario ni el login.
export function useFondoLogin() {
  const [fondo, setFondo] = useState({ estado: 'cargando', url: null });
  useEffect(() => {
    let activo = true, finalizado = false;
    const imagen = new Image();
    const url = window.matchMedia('(max-width: 700px)').matches ? heroMobile : hero;
    const terminar = disponible => {
      if (!activo || finalizado) return;
      finalizado = true;
      clearTimeout(timer);
      setFondo({ estado: disponible ? 'foto' : 'fallback', url: disponible ? url : null });
    };
    const timer = setTimeout(() => terminar(false), 2500);
    imagen.onload = async () => {
      try { if (imagen.decode) await imagen.decode(); terminar(imagen.naturalWidth > 0); }
      catch { terminar(false); }
    };
    imagen.onerror = () => terminar(false);
    imagen.src = url;
    return () => { activo = false; clearTimeout(timer); imagen.onload = null; imagen.onerror = null; };
  }, []);
  return fondo;
}
