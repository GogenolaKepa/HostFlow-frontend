import {useEffect,useState} from 'react';
import {MarcoCuenta,SolicitarRecuperacion,ConfirmarCuenta,GestionInvitaciones,ConfirmarContacto} from './ExperienciaComercial';
// Usado por las rutas públicas del producto; capacidades siempre verificadas en servidor.
export function EnlaceRecuperacionPreparado({capacidades,abrir}){
  return capacidades?.recuperacion===true?<button type="button" className="ac-volver" onClick={abrir}>¿Olvidaste tu contraseña?</button>:null;
}
export function EntradaComercialPreparada({entrada,conexion,volver,usuario}){
  const [estado,setEstado]=useState({cargando:true,capacidades:null});
  useEffect(()=>{const abort=new AbortController();let vigente=true;
    setEstado({cargando:true,capacidades:null});
    conexion.capacidades(abort.signal).then(capacidades=>{if(vigente)setEstado({cargando:false,capacidades});}).catch(()=>{if(vigente)setEstado({cargando:false,capacidades:null});});
    return()=>{vigente=false;abort.abort();};
  },[conexion]);
  if(estado.cargando)return <MarcoCuenta volver={volver}><div className="ac-validando" role="status"><span className="ac-linea"/><h2>Preparando tu acceso</h2></div></MarcoCuenta>;
  const invitacion=['invitaciones','gestion'].includes(entrada?.tipo);
  if(!estado.capacidades?.[entrada?.tipo==='contacto'?'contactos':invitacion?'invitaciones':'recuperacion'])return <MarcoCuenta volver={volver}><h2>Este acceso aún no está disponible</h2><p>Contactá al administrador de tu equipo para continuar.</p></MarcoCuenta>;
  if(entrada.tipo==='contacto')return <ConfirmarContacto key={entrada.tokenInicial} cliente={conexion.cliente} tokenInicial={entrada.tokenInicial} volver={volver}/>;
  if(entrada.tipo==='gestion')return <GestionInvitaciones cliente={conexion.cliente} usuario={usuario}/>;
  if(entrada.tipo==='solicitar')return <SolicitarRecuperacion cliente={conexion.cliente} volver={volver}/>;
  if(!['recuperacion','invitaciones'].includes(entrada.tipo))return null;
  return <ConfirmarCuenta key={entrada.tipo+':'+entrada.tokenInicial} tipo={entrada.tipo} tokenInicial={entrada.tokenInicial} cliente={conexion.cliente} volver={volver}/>;
}
