import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const metadata=read('public/identidad-publica.js');
function ejecutar(pathname){const valores={};const document={title:'',querySelector:s=>({setAttribute:(a,v)=>{valores[s+':'+a]=v;}})};vm.runInNewContext(metadata,{window:{location:{pathname}},document});return {titulo:document.title,valores};}
test('canonical oficial y título público; sin copiar query ni fragmento',()=>{
 const r=ejecutar('/');assert.match(r.titulo,/Gestión/);assert.equal(r.valores['link[rel="canonical"]:href'],'https://hostflow.com.ar');assert.equal(r.valores['meta[name="robots"]:content'],'index,follow');
 assert.equal(/location\.(search|hash)|localStorage|fetch\(/.test(metadata),false);
});
test('demo tiene canonical propio y descripción honesta',()=>{
 const r=ejecutar('/demo/');assert.equal(r.valores['link[rel="canonical"]:href'],'https://hostflow.com.ar/demo');assert.match(r.valores['meta[name="description"]:content'],/ficticios/);
});
test('acceso y rutas privadas piden noindex; no se indexan como landing',()=>{
 for(const ruta of ['/login','/cuenta/recuperar','/reservas'])assert.equal(ejecutar(ruta).valores['meta[name="robots"]:content'],'noindex,nofollow');
});
function lum(hex){return [1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
test('pares AA de las tres paletas: texto, botones, acentos y superficie',()=>{
 for(const p of [['#a9eacc','#78cee8'],['#78cee8','#b5cfff'],['#78cee8','#a9eacc']])for(const [fg,bg] of [['#f3f8fc','#0b1626'],['#b8c8d9','#132337'],...p.map(x=>[x,'#132337']),...p.map(x=>['#0b1626',x])]){const a=lum(fg),b=lum(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+'/'+bg);}
});
test('recursos autocontenidos, iconos con dimensiones y tarjeta social disponible',()=>{
 for(const name of ['isotipo.svg','favicon.svg','horizontal-claro.svg','horizontal-oscuro.svg','monocromatico.svg']){const s=read('public/brand/'+name);assert.match(s,/viewBox=/);assert.equal(/href="https?:/.test(s),false);}
 for(const [name,w,h] of [['favicon-32.png',32,32],['apple-touch-icon.png',180,180],['compartir.png',1200,630]]){const b=fs.readFileSync(new URL('../public/brand/'+name,import.meta.url));assert.equal(b.readUInt32BE(16),w);assert.equal(b.readUInt32BE(20),h);}
});
test('SEO no publica rutas privadas en sitemap y conserva controles de apariencia',()=>{
 const html=read('index.html');assert.match(html,/og:image/);assert.match(html,/appearance\.js/);assert.match(html,/identidad-publica\.js/);assert.equal(/login|cuenta|reservas/.test(read('public/sitemap.xml')),false);
});
