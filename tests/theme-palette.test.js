import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/styles/theme.css", import.meta.url), "utf8");
const appCss = fs.readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
function luminance(hex) {
  const rgb = [1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a,b) { const values=[luminance(a),luminance(b)].sort((a,b)=>b-a); return (values[0]+.05)/(values[1]+.05); }
test("tokens legibles para texto, mensajes, navegación y botones en ambas paletas",()=>{
  const blocks=css.match(/:root[^{}]*\{[^{}]+\}/g);
  const base=Object.fromEntries([...blocks[0].matchAll(/(--hf-[\w-]+):\s*(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]));
  for(const [index,block] of blocks.entries()) {
    const tokens={...base,...Object.fromEntries([...block.matchAll(/(--hf-[\w-]+):\s*(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]))};
    const pairs=[['text','surface-raised'],['text-muted','canvas'],['text-faint','surface-raised'],['nav-text','nav-bg'],['on-brand','primary'],['on-brand','primary-hover']];
    for(const family of ['info','success','warning','danger','violet','cyan','teal'])pairs.push([family+'-text',family+'-soft']);
    for(const [fg,bg] of pairs)assert.ok(contrast(tokens['--hf-'+fg],tokens['--hf-'+bg])>=4.5,`Contraste insuficiente: ${index?'oscuro':'claro'} ${fg}/${bg}`);
  }
});
test("bootstrap bloqueante precede a React y los módulos usan tokens sin filtros de inversión",()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('src="/appearance.js"')<html.indexOf('<body>'));
  assert.ok(html.indexOf('src="/appearance.js"')<html.indexOf('src="/src/main.jsx"'));
  assert.equal(/filter:\s*invert\(/.test(appCss),false);
  for(const prefix of ['calendar-','limpiezas-','reportes-','alertas-','flowia-','security-'])assert.ok(appCss.includes(prefix));
  assert.ok(appCss.includes('var(--hf-surface-raised)'));
});
