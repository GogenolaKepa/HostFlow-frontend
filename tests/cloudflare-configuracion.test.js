import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolverBaseApi,validarBaseApi,validarBuildPublico} from '../src/services/configuracionApiPublica.js';
import {crearConexionComercial} from '../src/services/conexionComercialPreparada.js';
import {mensajeErrorAcceso,SERVICIO_DESCONECTADO} from '../src/services/disponibilidadApi.js';
test('API local independiente; producción nunca inventa un puerto de desarrollo',()=>{
  assert.equal(resolverBaseApi({env:{DEV:true},ubicacion:{protocol:'http:',hostname:'192.168.1.24'}}),'http://192.168.1.24:4000/api');
  assert.equal(resolverBaseApi({env:{PROD:true},ubicacion:{protocol:'https:',hostname:'hostflow.com.ar'}}),'/api');
  assert.equal(resolverBaseApi({env:{DEV:false,VITE_API_URL:'https://api.hostflow.com.ar/api'}}),'https://api.hostflow.com.ar/api');
  assert.equal(validarBaseApi('http://127.0.0.1:4000/api',{desarrollo:true}),'http://127.0.0.1:4000/api');
});
test('configuraciones públicas inseguras y secretos VITE bloquean el build',()=>{
  for(const v of ['http://api.hostflow.com.ar/api','https://localhost/api','https://127.0.0.1/api','//api.hostflow.com.ar/api','https://api.hostflow.com.ar/api?token=x','https://a:b@api.hostflow.com.ar/api','https://api.hostflow.com.ar/otra','https://api.hostflow.com.ar/api#x'])assert.throws(()=>validarBaseApi(v));
  assert.throws(()=>validarBuildPublico({},'cloudflare'));
  const env={VITE_API_URL:'https://api.hostflow.com.ar/api',VITE_PUBLIC_ORIGIN:'https://hostflow.com.ar'};
  assert.doesNotThrow(()=>validarBuildPublico(env,'cloudflare'));
  for(const k of ['VITE_RESEND_API_KEY','VITE_JWT_SECRET','VITE_DPAPI','VITE_DB_PASSWORD'])assert.throws(()=>validarBuildPublico({...env,[k]:'SOLO-FICTICIO'},'cloudflare'));
});
test('invitaciones y recuperación usan la API separada, sin cookies ni reenvíos',async()=>{
  const llamadas=[];
  const c=crearConexionComercial({origen:'https://hostflow.com.ar',apiBase:'https://api.hostflow.com.ar/api',obtenerToken:()=> 'jwt-ficticio',transportar:async(url,opts)=>{
    llamadas.push({url,opts});return{status:url.endsWith('capacidades')?200:202,json:async()=>({version:1,recuperacion:true,invitaciones:true})};
  }});
  await c.capacidades();await c.cliente.solicitar('ficticio@example.invalid');await c.cliente.invitar('Ficticio','ficticio@example.invalid');
  assert.ok(llamadas.every(l=>l.url.startsWith('https://api.hostflow.com.ar/api/cuentas-comerciales/')&&l.opts.credentials==='omit'&&l.opts.redirect==='error'));
  assert.equal(llamadas[1].opts.headers.Authorization,undefined);assert.equal(llamadas[2].opts.headers.Authorization,'Bearer jwt-ficticio');
  assert.ok(llamadas.every(l=>!l.url.includes('token=')));assert.equal(llamadas.length,3);
  assert.throws(()=>crearConexionComercial({origen:'https://hostflow.com.ar',apiBase:'http://api.hostflow.com.ar/api',transportar:()=>{}}));
});
test('servicio apagado tiene explicación útil; credenciales incorrectas conservan su error',()=>{
  for(const e of [{code:'ERR_NETWORK'},{code:'ECONNABORTED'},{response:{status:502,data:{mensaje:'interno'}}},{response:{status:503}}])assert.equal(mensajeErrorAcceso(e),SERVICIO_DESCONECTADO);
  assert.equal(mensajeErrorAcceso({response:{status:401,data:{mensaje:'Credenciales inválidas.'}}}),'Credenciales inválidas.');
});
test('Pages conserva configuración SWA y prepara cabeceras para enlaces sensibles',()=>{
  const h=fs.readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
  assert.match(h,/Referrer-Policy: no-referrer/);assert.match(h,/\/cuenta\/\*[\s\S]*Cache-Control: no-store/);
  const sensibles=h.split('/cuenta/*')[1].split(/\n(?=\S)/)[0];
  assert.match(sensibles,/Content-Security-Policy: script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'/);
  assert.doesNotMatch(sensibles,/unsafe-inline|unsafe-eval|static\.cloudflareinsights\.com/);
  assert.ok(fs.existsSync(new URL('../public/staticwebapp.config.json',import.meta.url)));
  assert.ok(!fs.existsSync(new URL('../public/404.html',import.meta.url)));
});

test('entrada desde login solicita documento protegido: cambiar solo history no aplica cabeceras CSP',()=>{
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/abrirRecuperacion=\{\(\)=>window\.location\.assign\('\/cuenta\/solicitar'\)\}/);
});
