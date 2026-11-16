import {useEffect,useState} from 'react';
import api from '../services/api';
import {SESION_CERRADA} from '../services/session';
import {clasificarImagen} from '../services/imagenAutorizada';
export default function ImagenPropiedadSegura({src,...props}){
 const [imagen,setImagen]=useState(null);
 useEffect(()=>{
  const destino=clasificarImagen(src,api.defaults.baseURL,window.location.origin),control=new AbortController();let blobUrl;
  setImagen(null);
  const cerrar=()=>{control.abort();if(blobUrl)URL.revokeObjectURL(blobUrl);setImagen(null);};
  window.addEventListener(SESION_CERRADA,cerrar);
  if(destino&&!destino.privada)setImagen(destino.url);
  else if(destino){
   api.get(destino.url,{responseType:'blob',signal:control.signal}).then(({data})=>{
    if(control.signal.aborted||!['image/jpeg','image/png','image/webp'].includes(data?.type)||data.size>8*1024*1024)return;
    blobUrl=URL.createObjectURL(data);setImagen(blobUrl);
   }).catch(()=>{if(!control.signal.aborted)setImagen(null);});
  }
  return()=>{window.removeEventListener(SESION_CERRADA,cerrar);control.abort();if(blobUrl)URL.revokeObjectURL(blobUrl);};
 },[src]);
 return <img {...props} src={imagen||undefined}/>;
}
