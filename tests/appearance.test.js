import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const code = fs.readFileSync(new URL("../public/appearance.js", import.meta.url), "utf8");
const KEY = "hostflow.apariencia.v1";
function browser({ saved, dark = false, denied = false } = {}) {
  const data = new Map(saved === undefined ? [] : [[KEY, saved]]), reads = [], events = {}, callbacks = new Set();
  const media = { matches: dark, addEventListener(_type, listener) { callbacks.add(listener); } };
  const root = { document: { documentElement: { dataset: {}, style: {} } },
    localStorage: { getItem(key) { reads.push(key); if (denied) throw Error(); return data.get(key) ?? null; },
      setItem(key, value) { if (denied) throw Error(); data.set(key, value); } },
    matchMedia: () => media, addEventListener(type, callback) { events[type] = callback; } };
  vm.createContext(root); vm.runInContext(code, root);
  return { root, data, reads, events, store: root.HostFlowAppearance,
    system(value) { media.matches = value; callbacks.forEach(fn => fn()); }, rerun() { vm.runInContext(code, root); }, callbacks };
}
test("inicio claro sin preferencia aun con sistema oscuro; solo lee apariencia antes de React", () => {
  const b = browser({ dark: true });
  assert.equal(b.root.document.documentElement.dataset.theme, "light");
  assert.equal(b.root.document.documentElement.style.colorScheme, "light");
  assert.deepEqual(b.reads, [KEY]); assert.equal(b.data.size, 0);
  assert.equal(b.store.getSnapshot().persisted, false);
});
test("tema oscuro persistido se aplica antes de React; no se aceptan valores arbitrarios", () => {
  assert.equal(browser({ saved: "oscuro" }).root.document.documentElement.dataset.theme, "dark");
  for (const saved of ["dark", '{"token":"invalido"}', "<script>", ""]) assert.equal(browser({ saved }).store.getSnapshot().preference, "claro");
  const b = browser(); assert.equal(b.store.setPreference("desconocido"), false); assert.equal(b.data.size, 0);
});
test("elegir persiste solo el valor no sensible y sobrevive una nueva carga", () => {
  const b = browser(); assert.equal(b.store.setPreference("oscuro"), true);
  assert.deepEqual([...b.data], [[KEY, "oscuro"]]); assert.equal(b.store.getSnapshot().persisted, true);
  const restored = browser({ saved: b.data.get(KEY) });
  assert.equal(restored.store.getSnapshot().theme, "dark");
});
test("automatico sigue y reacciona al sistema; opciones explicitas prevalecen", () => {
  const b = browser({ saved: "automatico" }); b.system(true);
  assert.equal(b.store.getSnapshot().theme, "dark"); assert.equal(b.data.get(KEY), "automatico");
  b.system(false); assert.equal(b.store.getSnapshot().theme, "light");
  b.store.setPreference("oscuro"); b.system(false); assert.equal(b.store.getSnapshot().theme, "dark");
  b.store.setPreference("claro"); b.system(true); assert.equal(b.store.getSnapshot().theme, "light");
});
test("almacenamiento bloqueado aplica apariencia sin fingir guardado", () => {
  const b = browser({ denied: true }); b.store.setPreference("oscuro");
  assert.equal(b.store.getSnapshot().theme, "dark"); assert.equal(b.store.getSnapshot().persisted, false);
  assert.equal(b.store.getSnapshot().storageAvailable, false);
});
test("sincroniza solo preferencias entre pestañas y no procesa claves de sesion", () => {
  const b = browser(); b.events.storage({ key: "token", newValue: "valor-ficticio" });
  assert.equal(b.store.getSnapshot().preference, "claro");
  b.events.storage({ key: KEY, newValue: "oscuro", storageArea: b.root.localStorage });
  assert.equal(b.store.getSnapshot().theme, "dark");
  b.events.storage({ key: KEY, newValue: "invalido" }); assert.equal(b.store.getSnapshot().theme, "light");
});
test("suscriptores se limpian, snapshot estable y bootstrap duplicado no agrega listeners", () => {
  const b = browser(); const first = b.store.getSnapshot(); assert.equal(b.store.getSnapshot(), first);
  let calls = 0; const unsubscribe = b.store.subscribe(() => calls++);
  b.store.setPreference("oscuro"); assert.equal(calls, 1); unsubscribe(); b.store.setPreference("claro"); assert.equal(calls, 1);
  b.rerun(); assert.equal(b.callbacks.size, 1); assert.equal(b.root.HostFlowAppearance, b.store);
});
