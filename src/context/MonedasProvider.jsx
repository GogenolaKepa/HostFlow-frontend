import {useCallback,useEffect,useState} from 'react';
import {MonedasContext as Contexto} from './MonedasContext';
import api from '../services/api';
export function MonedasProvider({children}) {
 const [estado,setEstado]=useState(null),[tarifas,setTarifas]=useState([]),[error,setError]=useState('');
 const recargar=useCallback(async(signal)=>{
  try {
   const {data}=await api.get('/monedas/estado',{signal});
   if(typeof data.activado!=='boolean'||typeof data.escritura!=='boolean'||!['sql','pendiente'].includes(data.persistencia)||!Array.isArray(data.fuentes))throw Error('Estado incompleto');
   if(signal?.aborted)return;
   setEstado(data);setError('');
   if(data.activado){const respuesta=await api.get('/monedas/tarifas',{signal});if(!Array.isArray(respuesta.data.tarifas))throw Error('Tarifas incompletas');if(!signal?.aborted)setTarifas(respuesta.data.tarifas);}
   else setTarifas([]);
  } catch {if(!signal?.aborted){setTarifas([]);setError('No se pudo comprobar el estado de monedas. No se presume una moneda para los importes históricos.');}}
 },[]);
 useEffect(()=>{const controller=new AbortController();recargar(controller.signal);return()=>controller.abort();},[recargar]);
 return <Contexto.Provider value={{estado,tarifas,error,recargar}}>{children}</Contexto.Provider>;
}
