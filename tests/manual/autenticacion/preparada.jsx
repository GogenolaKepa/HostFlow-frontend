// Entrada de prueba únicamente. Transporte íntegramente ficticio, sin backend.
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {EntradaComercialPreparada} from '../../../src/components/autenticacion/EntradaComercialPreparada';
import {crearConexionComercial} from '../../../src/services/conexionComercialPreparada';
import '../../../src/styles/theme.css';import './laboratorio.css';
window.ensayoPreparado={disponible:true,fallarValidar:false,enlaceInvalido:false,fallarConfirmar:false,revocada:false,llamadas:[]};
const conexion=crearConexionComercial({origen:'https://cuentas.example.invalid',obtenerToken:()=> 'sesion-ficticia',transportar:async(url,opciones)=>{
  const e=window.ensayoPreparado;e.llamadas.push({ruta:new URL(url).pathname,metodo:opciones.method,autorizacion:!!opciones.headers.Authorization});
  let status=204,data;
  if(url.endsWith('/capacidades')){status=200;data={version:1,recuperacion:e.disponible,invitaciones:e.disponible};}
  else if(url.endsWith('/validar')&&e.enlaceInvalido){status=400;data={codigo:'ENLACE_INVALIDO'};}
  else if(url.endsWith('/validar')&&e.fallarValidar){status=503;data={};}
  else if(url.endsWith('/confirmar')&&e.fallarConfirmar){status=503;data={};}
  else if(url.endsWith('/solicitar')){status=202;data={mensaje:'neutral'};}
  else if(opciones.method==='GET'&&new URL(url).pathname.endsWith('/invitaciones')){status=200;data={pagina:1,hayMas:false,invitaciones:[{id:'10000000-0000-4000-8000-000000000001',nombre:'Persona ficticia',email:'ficticio@example.invalid',expiraEn:'2030-01-01T00:00:00Z',estado:e.revocada?'Revocada':'Pendiente'}]};}
  else if(url.endsWith('/revocar')){e.revocada=true;}
  return {status,json:async()=>data};
}});
export function Ensayo(){const [entrada,setEntrada]=useState({tipo:'solicitar'}),[revision,setRevision]=useState(0),[admin,setAdmin]=useState(false);
  return <><nav className="lab-bar"><strong>FICTICIO · SIN SQL NI CORREOS</strong>
    <button onClick={()=>{window.ensayoPreparado.disponible=!window.ensayoPreparado.disponible;setRevision(r=>r+1);}}>Disponibilidad</button>
    <button onClick={()=>setEntrada({tipo:'invitaciones',tokenInicial:'a'.repeat(43)})}>Invitación ficticia</button>
    <button onClick={()=>setEntrada({tipo:'gestion'})}>Gestión Operador</button></nav>
    <button onClick={()=>{setAdmin(true);setEntrada({tipo:'gestion'});}}>Gestión Administrador</button>
    <EntradaComercialPreparada key={revision} entrada={entrada} conexion={conexion} usuario={{rol:admin?'Administrador':'Operador',permisos:admin?['usuarios.crear']:[]}} volver={()=>setEntrada({tipo:'solicitar'})}/></>;
}
createRoot(document.getElementById('root')).render(<Ensayo/>);
