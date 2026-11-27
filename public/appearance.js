/* El arranque usa la apariencia pública. React selecciona las preferencias
   locales después de verificar la sesión con el servidor. */
(function (root) {
  if (root.HostFlowAppearance) return;
  const KEY = "hostflow.apariencia.v1";
  const themes = new Map([
    ["claro", "light"], ["oscuro", "dark"], ["crema", "cream"], ["grafito", "graphite"],
  ]);
  // Las preferencias automáticas ya guardadas siguen el sistema hasta elegir un tema.
  const valid = value => value === "automatico" || themes.has(value);
  let key = null, preference = "claro", persisted = false, storageAvailable = false;
  let media;
  try { media = root.matchMedia?.("(prefers-color-scheme: dark)"); } catch { /* Sistema sin deteccion. */ }
  const listeners = new Set();
  let snapshot;
  function update() {
    const system = media?.matches ? "dark" : "light";
    const theme = preference === "automatico" ? system : themes.get(preference);
    if (root.document) {
      const { dataset } = root.document.documentElement;
      dataset.theme = theme;
      if (key) delete dataset.hfAparienciaPublica;
      else dataset.hfAparienciaPublica = "";
    }
    if (snapshot?.preference === preference && snapshot.theme === theme && snapshot.system === system &&
        snapshot.persisted === persisted && snapshot.storageAvailable === storageAvailable && snapshot.personal === Boolean(key)) return;
    snapshot = Object.freeze({ preference, theme, system, persisted, storageAvailable, personal: Boolean(key) });
    listeners.forEach(listener => listener());
  }
  function setScope(scope) {
    const next = scope ? `${KEY}:${scope}` : null;
    if (next === key) return;
    key = next;
    preference = "claro";
    persisted = false;
    storageAvailable = false;
    if (key) {
      try {
        const saved = root.localStorage.getItem(key);
        storageAvailable = true;
        if (valid(saved)) { preference = saved; persisted = true; }
      } catch { /* La apariencia todavía se puede cambiar durante la sesión. */ }
    }
    update();
  }
  function setPreference(value) {
    if (!key || !valid(value)) return false;
    preference = value;
    try { root.localStorage.setItem(key, value); persisted = true; storageAvailable = true; }
    catch { persisted = false; storageAvailable = false; }
    update();
    return true;
  }
  update();
  if (media?.addEventListener) media.addEventListener("change", update);
  else media?.addListener?.(update);
  root.addEventListener?.("storage", event => {
    if (!key || (event.key !== key && event.key !== null)) return;
    try { if (event.storageArea && event.storageArea !== root.localStorage) return; }
    catch { return; }
    preference = valid(event.newValue) ? event.newValue : "claro";
    persisted = valid(event.newValue);
    update();
  });
  root.HostFlowAppearance = Object.freeze({ KEY, setScope, setPreference,
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
})(globalThis);
