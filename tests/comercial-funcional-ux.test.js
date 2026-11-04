import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {cacheViteAislada} from './helpers/cacheVite.js';
import fs from 'node:fs';
let vite,ui;const cache=cacheViteAislada();
before(async()=>{
 globalThis.window={location:{protocol:'http:',hostname:'localhost'}};
 vite=await createServer({configFile:false,envDir:false,cacheDir:cache.ruta,plugins:[react()],optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,ws:false,watch:null}});
 ui=await vite.ssrLoadModule('/src/components/autenticacion/ExperienciaComercial.jsx');
});
after(async()=>{await vite?.close();cache.limpiar();delete globalThis.window;});
test('recuperación identifica su alcance sin revelar si existe una cuenta',()=>{
 const html=renderToStaticMarkup(createElement(ui.SolicitarRecuperacion,{cliente:{},volver(){}}));
 assert.match(html,/Operadores con correo verificado/);assert.match(html,/Si sos Administrador/);assert.match(html,/la respuesta es la misma para todas las cuentas/);
});
test('invitaciones distinguen aceptación pendiente de entrega de correo y conservan permiso Admin',()=>{
 const html=renderToStaticMarkup(createElement(ui.GestionInvitaciones,{cliente:{},usuario:{rol:'Administrador',permisos:['usuarios.crear']}}));
 assert.match(html,/no confirma la entrega del correo/);assert.match(html,/Rol asignado por el servidor: Operador/);
 const denegado=renderToStaticMarkup(createElement(ui.GestionInvitaciones,{cliente:{},usuario:{rol:'Operador',permisos:[]}}));assert.match(denegado,/Acceso restringido/);assert.doesNotMatch(denegado,/ac-inv-email/);
});
test('hosting preparado sirve los enlaces SPA sin convertir las API en HTML ni registrar referencias',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../public/staticwebapp.config.json',import.meta.url)));
 assert.equal(c.navigationFallback.rewrite,'/index.html');assert.ok(c.navigationFallback.exclude.includes('/api/*'));
 assert.equal(c.routes.find(x=>x.route==='/cuenta/*').headers['Cache-Control'],'no-store');assert.equal(c.globalHeaders['Referrer-Policy'],'no-referrer');assert.equal(c.routes.some(x=>x.redirect),false);
});
