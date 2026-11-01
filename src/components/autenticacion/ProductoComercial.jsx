import {useEffect,useState} from 'react';
import {ComercialContext,useComercial} from '../../context/ComercialContext';
import {GestionInvitaciones,SolicitarVerificacionContacto} from './ExperienciaComercial';

export function ProveedorComercial({conexion,children}){
  const [acreditacion,setAcreditacion]=useState(null);
  useEffect(()=>{
    const abort=new AbortController();let vigente=true;
    if(conexion)conexion.capacidades(abort.signal).then(c=>{if(vigente)setAcreditacion({conexion,capacidades:c});})
      .catch(()=>{if(vigente)setAcreditacion(null);});
    return()=>{vigente=false;abort.abort();};
  },[conexion]);
  // Nunca conservar capacidades acreditadas por una conexión anterior.
  return <ComercialContext.Provider value={conexion?{conexion,capacidades:acreditacion?.conexion===conexion?acreditacion.capacidades:null}:null}>{children}</ComercialContext.Provider>;
}
export function ContactoDelProducto({usuario}){
  const comercial=useComercial();
  if(!comercial?.capacidades?.contactos||usuario?.rol!=='Operador'||usuario.debeCambiarPassword)return null;
  return <SolicitarVerificacionContacto cliente={comercial.conexion.cliente}/>;
}
export function InvitacionesDelProducto({usuario}){
  const comercial=useComercial();
  if(!comercial?.capacidades?.invitaciones||usuario?.rol!=='Administrador'||!usuario?.permisos?.includes('usuarios.crear'))return null;
  return <GestionInvitaciones cliente={comercial.conexion.cliente} usuario={usuario}/>;
}
