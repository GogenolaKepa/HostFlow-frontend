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
test("WCAG AA en los tokens de texto, badges, controles y foco de las cuatro paletas", () => {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
  for (const theme of ['light', 'dark', 'cream', 'graphite']) {
    const tokens = {};
    for (const [, selector, declarations] of blocks) {
      if (!selector.includes('[data-hf-preview]') && !selector.includes(`[data-hf-preview="${theme}"]`)) continue;
      for (const [, name, value] of declarations.matchAll(/--hf-([\w-]+):\s*(#[0-9a-f]{6})/g)) tokens[name] = value;
    }
    const pairs = [];
    for (const surface of ['canvas', 'surface', 'surface-raised', 'surface-soft', 'surface-muted']) {
      for (const text of ['text', 'text-secondary', 'text-muted', 'text-faint', 'info-text']) pairs.push([text, surface, 4.5]);
      pairs.push(['focus', surface, 3], ['control-border', surface, 3]);
    }
    for (const family of ['info', 'accent', 'success', 'warning', 'danger', 'violet', 'cyan', 'teal']) {
      pairs.push([`${family}-text`, `${family}-soft`, 4.5]);
    }
    pairs.push(['nav-text', 'nav-bg', 4.5], ['on-brand', 'primary', 4.5], ['on-brand', 'primary-hover', 4.5], ['on-brand', 'danger-solid', 4.5]);
    for (const [fg, bg, minimum] of pairs) {
      assert.ok(tokens[fg] && tokens[bg], `Faltan tokens: ${theme} ${fg}/${bg}`);
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(ratio >= minimum, `Contraste insuficiente: ${theme} ${fg}/${bg} ${ratio.toFixed(2)} < ${minimum}`);
    }
  }
});
test("bootstrap bloqueante precede a React y los módulos usan tokens sin filtros de inversión",()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const arranque=html.search(/src="\/appearance\.js(?:\?[^"]+)?"/);
  assert.ok(arranque>=0 && arranque<html.indexOf('<body>'));
  assert.ok(arranque<html.indexOf('src="/src/main.jsx"'));
  assert.equal(/filter:\s*invert\(/.test(appCss),false);
  for(const prefix of ['calendar-','limpiezas-','reportes-','alertas-','flowia-','security-'])assert.ok(appCss.includes(prefix));
  assert.ok(appCss.includes('var(--hf-surface-raised)'));
});
