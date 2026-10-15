import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { aplicarPredeterminados } from '../services/configuracion';

export default function usePredeterminadosReserva(abierto,setFormulario) {
  const modificados = useRef(new Set());
  const [estado,setEstado] = useState('');
  useEffect(()=>{
    if(!abierto) {setEstado('');return;}
    const controller = new AbortController();
    setEstado('Consultando horarios predeterminados…');
    api.get('/configuracion/predeterminados-reserva',{signal:controller.signal}).then(({data})=>{
      if(controller.signal.aborted)return;
      if(!data.predeterminados || data.predeterminados.zonaHoraria !== 'America/Argentina/Buenos_Aires' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.predeterminados.horaIngreso) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.predeterminados.horaEgreso)) throw Error('Predeterminados incompletos.');
      setFormulario(actual=>aplicarPredeterminados(actual,data.predeterminados,modificados.current));
      setEstado('Horarios iniciales de la empresa. Podés ajustarlos para esta reserva.');
    }).catch(()=>{
      if(!controller.signal.aborted)setEstado('Configuración empresarial no disponible; se conservan los horarios del formulario.');
    });
    return ()=>controller.abort();
  },[abierto,setFormulario]);
  return {estado,marcarCambio:campo=>{modificados.current.add(campo);},reiniciar:()=>modificados.current.clear()};
}
