// Entrada EXCLUSIVA del laboratorio: no forma parte de index.html ni del build operativo.
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SolicitarRecuperacion, ConfirmarCuenta, GestionInvitaciones } from '../../../src/components/autenticacion/ExperienciaComercial';
import { crearClienteComercial, retirarTokenDelEnlace } from '../../../src/services/autenticacionComercial';
import '../../../src/styles/theme.css';
import './laboratorio.css';

const entrada = retirarTokenDelEnlace(location.href, ruta => history.replaceState(null,'',ruta));
export function Laboratorio() {
  const [vista,setVista] = useState(entrada ? 'recuperacion' : 'solicitar'), [token,setToken]=useState(entrada), [rol,setRol]=useState('Administrador');
  const [revision,setRevision] = useState(0);
  const [correoEstado,setCorreoEstado] = useState('');
  const correoOcupado = useRef(false);
  const [cliente] = useState(()=>crearClienteComercial(async ({ ruta, metodo, body, signal }) => {
    const r = await fetch(ruta,{ method:metodo, headers:{'Content-Type':'application/json'}, body:body?JSON.stringify(body):undefined, signal, cache:'no-store', credentials:'same-origin' });
    return { status:r.status, data:r.status===204?undefined:await r.json() };
  }));
  function ir(v) { setToken(null); setRevision(r=>r+1); setVista(v); }
  async function abrirCorreo() {
    if(correoOcupado.current) return;
    correoOcupado.current=true;setCorreoEstado('Buscando correo ficticio…');
    try {
      const r=await fetch('/laboratorio/correo',{cache:'no-store'});
      if(!r.ok) throw Error('correo');
      const mail=await r.json();
      if(!mail.enlace) {
        setCorreoEstado(mail.estado==='fallo-procesamiento'
          ? 'El procesamiento ficticio falló. No se abrió ningún enlace; revisá el estado del laboratorio.'
          : 'No hay un enlace ficticio disponible para la última solicitud. Probá con 2@example.invalid; una cuenta no habilitada o el límite de solicitudes pueden no generar correo.');
        return;
      }
      if(!['invitaciones','recuperacion'].includes(mail.tipo)) throw Error('correo');
      const u=new URL(mail.enlace);
      if(u.origin!=='https://cuentas.example.invalid') throw Error('correo');
      const nuevo=retirarTokenDelEnlace(u.href,()=>{});
      if(!nuevo) throw Error('correo');
      // El enlace nunca se copia a la URL del laboratorio ni a almacenamiento persistente.
      setToken(nuevo);setVista(mail.tipo);setRevision(r=>r+1);
      setCorreoEstado('Enlace ficticio abierto. Su vigencia se comprueba al abrirlo.');
    } catch { setCorreoEstado('No se pudo consultar el correo ficticio. Podés volver a consultar sin reenviar la solicitud.'); }
    finally {correoOcupado.current=false;}
  }
  async function elegirRol(nuevo) { await fetch('/laboratorio/rol',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rol:nuevo})}); setRol(nuevo); }
  return <><nav className="lab-bar" aria-label="Controles del laboratorio"><strong>ENTORNO FICTICIO · SIN CORREOS REALES</strong><button onClick={()=>ir('solicitar')}>Recuperación</button><button onClick={()=>ir('gestion')}>Equipo</button><button onClick={abrirCorreo}>Abrir último enlace ficticio</button><button onClick={()=>elegirRol(rol==='Administrador'?'Operador':'Administrador')}>Rol: {rol}</button><button onClick={()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';}}>Cambiar tema</button></nav>
    <p className="lab-correo" role="status" aria-live="polite">{correoEstado}</p>
    {vista==='solicitar'?<SolicitarRecuperacion key={revision} cliente={cliente} volver={()=>ir('login')}/>:vista==='gestion'?<GestionInvitaciones cliente={cliente} usuario={{rol,permisos:rol==='Administrador'?['usuarios.crear']:[]}}/>:vista==='login'?<LoginFicticio ir={ir} alIngresar={u=>setRol(u.rol)}/>:<ConfirmarCuenta key={vista+revision} tipo={vista} tokenInicial={token} cliente={cliente} volver={()=>ir('login')}/>}
  </>;
}
export function LoginFicticio({ir,alIngresar}) {
  const [mensaje,setMensaje]=useState('');
  return <section className="ac-gestion"><h1>Iniciar sesión · entorno ficticio</h1><form onSubmit={async e=>{e.preventDefault(); const datos=new FormData(e.currentTarget); const r=await fetch('/laboratorio/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(datos))}); if(r.ok){const data=await r.json();alIngresar(data.usuario);}setMensaje(r.ok?'Sesión ficticia iniciada':'Credenciales ficticias inválidas');}}><label htmlFor="lab-email">Correo</label><input id="lab-email" name="email" type="email"/><label htmlFor="lab-password">Contraseña</label><input id="lab-password" name="password" type="password"/><button className="ac-primario">Ingresar al entorno ficticio</button></form><p role="status">{mensaje}</p><button onClick={()=>ir('solicitar')}>Recuperar acceso</button></section>;
}
createRoot(document.getElementById('root')).render(<Laboratorio/>);
