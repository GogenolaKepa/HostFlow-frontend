import {crearClienteComercial,retirarTokenDelEnlace} from './autenticacionComercial.js';
import {obtenerToken} from './session.js';
import {resolverBaseApi,validarBaseApi} from './configuracionApiPublica.js';
// No hay flags Vite que habiliten capacidades. Solo respuesta del servidor HTTPS.
export function conexionComercialDelProducto(){
  if(window.location.protocol!=='https:')return null;
  return crearConexionComercial({origen:window.location.origin,
    apiBase:resolverBaseApi({env:import.meta.env??{},ubicacion:window.location}),
    transportar:window.fetch.bind(window),obtenerToken});
}
// Se llama antes de React/telemetría en una futura entrada autorizada, nunca al importar.
export function prepararEntradaComercial(href,reemplazar){
  const u=new URL(href),tipos={'/cuenta/recuperacion':'recuperacion','/cuenta/invitacion':'invitaciones','/cuenta/solicitar':'solicitar','/cuenta/contacto':'contacto'};
  const tipo=tipos[u.pathname];if(!tipo)return null;
  const token=retirarTokenDelEnlace(href,reemplazar);
  return Object.freeze({tipo,tokenInicial:tipo==='solicitar'?null:token});
}
export function crearConexionComercial({origen,apiBase=origen+'/api',transportar,obtenerToken=()=>null,timeoutMs=10000}={}){
  const u=new URL(origen);
  if(u.protocol!=='https:'||u.origin!==origen||u.username||u.password||typeof transportar!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw TypeError('Conexión comercial no acreditada.');
  validarBaseApi(apiBase);
  const apiOrigen=new URL(apiBase,origen).origin;
  async function pedir({ruta,metodo='GET',body,signal}){
    if(!ruta.startsWith('/api/cuentas-comerciales/')||!['GET','POST'].includes(metodo))throw Error('Ruta no admitida.');
    const destino=new URL(ruta,apiOrigen);if(destino.origin!==apiOrigen||!destino.pathname.startsWith('/api/cuentas-comerciales/')||destino.hash||destino.searchParams.has('token'))throw Error('Destino no admitido.');
    const admin=/^\/api\/cuentas-comerciales\/invitaciones(?:\?|$|\/[a-f0-9-]+\/revocar$)/.test(ruta);
    const contacto=/^\/api\/cuentas-comerciales\/contacto\/(solicitar|validar|confirmar)$/.test(ruta);
    const token=admin||contacto?obtenerToken():null;
    if(token&&(typeof token!=='string'||/[\r\n\s]/.test(token)))throw Error('Sesión no acreditada.');
    const controller=new AbortController(),cancelar=()=>controller.abort();signal?.addEventListener('abort',cancelar,{once:true});if(signal?.aborted)cancelar();
    const timer=setTimeout(cancelar,timeoutMs);
    try{
      const r=await transportar(destino.href,{method:metodo,signal:controller.signal,redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
        headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,data:r.status===204?undefined:await r.json()};
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancelar);}
  }
  return Object.freeze({cliente:crearClienteComercial(pedir),async capacidades(signal){
    const r=await pedir({ruta:'/api/cuentas-comerciales/capacidades',signal});
    if(r.status!==200||r.data?.version!==1||typeof r.data.recuperacion!=='boolean'||typeof r.data.invitaciones!=='boolean')throw Error('Capacidades no acreditadas.');
    if(r.data.contactos!==undefined&&typeof r.data.contactos!=='boolean')throw Error('Capacidad de contacto no acreditada.');
    return Object.freeze({recuperacion:r.data.recuperacion,invitaciones:r.data.invitaciones,...(r.data.contactos!==undefined?{contactos:r.data.contactos}:{})});
  }});
}
