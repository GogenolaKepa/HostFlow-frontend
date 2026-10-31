import {createServer as crearHttp} from 'node:http';
import http from 'node:http';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {cacheViteAislada} from './cacheVite.js';
import {puertoAislado} from './puertoAislado.js';
const require=createRequire(import.meta.url);
// Solo test; no se usa server.js, database.js, .env ni servicios operativos.
const {crearEntornoComercialHttp}=require('../../../backend/tests/helpers/entornoComercialHttp.js');
export async function iniciarLaboratorioComercial(){
  const ctx=await crearEntornoComercialHttp({relojReal:true});const cache=cacheViteAislada();
  const api=crearHttp(ctx.app);let vite,base,bearer=ctx.tokenAdmin(),trabajo=Promise.resolve();
  const peticiones=[];let ultimoCorreo=null,falloProcesamiento=false;
  async function cerrar(){await trabajo.catch(()=>{});await vite?.close();if(api.listening)await new Promise(r=>api.close(r));cache.limpiar();}
  try{
    await new Promise((resolve,reject)=>{api.once('error',reject);api.listen(0,'127.0.0.1',resolve);});
    const frontend=fileURLToPath(new URL('../..',import.meta.url));
    const plugin={name:'http-comercial-aislado',configureServer(server){server.middlewares.use(async(req,res,next)=>{
      if(!req.url.startsWith('/api/')&&!req.url.startsWith('/laboratorio/'))return next();
      if(req.headers.origin && req.headers.origin!==base){res.statusCode=403;res.end();return;}
      res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
      if(req.url.startsWith('/laboratorio/')){
        const trozos=[];for await(const b of req)trozos.push(b);let datos={};try{if(trozos.length)datos=JSON.parse(Buffer.concat(trozos).toString());}catch{res.statusCode=400;res.end();return;}
        res.setHeader('Content-Type','application/json');
        if(req.url==='/laboratorio/rol'){const id=datos.rol==='Operador'?2:1;const sesion=ctx.auth.emitirSesion(await ctx.repository.usuario(id));bearer=sesion.token;res.end(JSON.stringify({usuario:sesion.usuario}));return;}
        if(req.url==='/laboratorio/correo'){await trabajo;const m=ultimoCorreo;res.end(JSON.stringify(m?{enlace:m.enlace,tipo:m.plantilla==='invitacion'?'invitaciones':'recuperacion'}:{estado:falloProcesamiento?'fallo-procesamiento':'sin-enlace'}));return;}
        if(req.url==='/laboratorio/login'){try{const sesion=await ctx.auth.login(datos.email,datos.password);bearer=sesion.token;res.end(JSON.stringify({usuario:sesion.usuario}));}catch{res.statusCode=401;res.end('{}');}return;}
        res.statusCode=404;res.end('{}');return;
      }
      // Solo se registran ruta/método/estado; nunca cuerpos, passwords o tokens.
      const destino=http.request({hostname:'127.0.0.1',port:api.address().port,path:req.url,method:req.method,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${bearer}`}},r=>{
        peticiones.push({ruta:req.url,metodo:req.method,status:r.statusCode});res.writeHead(r.statusCode,r.headers);
        // Se agenda ANTES de publicar la respuesta. Una consulta inmediata espera ese trabajo.
        const generaCorreo=req.method==='POST'&&r.statusCode<300&&['/api/cuentas-comerciales/recuperacion/solicitar','/api/cuentas-comerciales/invitaciones'].includes(req.url);
        if(generaCorreo) trabajo=trabajo.then(async()=>{
          ultimoCorreo=null;falloProcesamiento=false;const antes=ctx.correos.length;
          try {await ctx.procesar();ultimoCorreo=ctx.correos.slice(antes).filter(m=>m.enlace).at(-1)||null;
            falloProcesamiento=!ultimoCorreo&&[...ctx.repository.entregas.values()].some(m=>m.intentos>0&&m.estado!=='entregada');
          }catch{falloProcesamiento=true;}
        });
        r.pipe(res);
      });
      destino.once('error',()=>{res.statusCode=503;res.end('{}');});req.pipe(destino);
    });}};
    vite=await createServer({root:path.join(frontend,'tests/manual/autenticacion'),configFile:false,envDir:false,publicDir:false,cacheDir:cache.ruta,plugins:[react(),plugin],server:{host:'127.0.0.1',port:await puertoAislado(),strictPort:true,ws:false,watch:null,fs:{allow:[frontend]}}});
    await vite.listen();base=`http://127.0.0.1:${vite.httpServer.address().port}`;
    return {base,ctx,peticiones,cerrar,esperarTrabajo:()=>trabajo};
  }catch(e){await cerrar();throw e;}
}
