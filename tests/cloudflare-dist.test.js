import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
test('artefacto Cloudflare sin canarios privados, mapas ni .env; conserva recursos y configuración SWA',()=>{
  const root=fileURLToPath(new URL('../dist',import.meta.url));
  function archivos(p){return fs.readdirSync(p).flatMap(n=>fs.statSync(path.join(p,n)).isDirectory()?archivos(path.join(p,n)):[path.join(p,n)]);}
  const lista=archivos(root);assert.ok(lista.length>10);
  for(const p of lista){assert.ok(!/\.env|\.map$/.test(path.basename(p)));if(/\.(js|html|css|json|txt)$/.test(p)){
    const s=fs.readFileSync(p,'utf8');for(const secreto of ['SOLO_FICTICIO_NO_DEBE_APARECER_EN_DIST_4NOV','SOLO_FICTICIO_SQL_NO_DIST_4NOV','-----BEGIN PRIVATE KEY-----'])assert.ok(!s.includes(secreto),'El build no debe publicar secretos.');
  }}
  assert.ok(fs.existsSync(path.join(root,'_headers')));assert.ok(fs.existsSync(path.join(root,'staticwebapp.config.json')));assert.ok(!fs.existsSync(path.join(root,'404.html')));
  assert.ok(lista.some(p=>p.endsWith('.webp')));
  assert.ok(lista.filter(p=>p.endsWith('.js')).some(p=>fs.readFileSync(p,'utf8').includes('https://api.hostflow.com.ar/api')));
});
