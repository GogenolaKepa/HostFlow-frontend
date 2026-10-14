/* Preferencia no sensible. Este mismo archivo inicia antes del primer pintado
   y se reutiliza en React; no lee tokens ni datos de la cuenta. */
(function (root) {
  if (root.HostFlowAppearance) return;
  const KEY = "hostflow.apariencia.v1";
  const modes = ["claro", "oscuro", "automatico"];
  const valid = value => modes.includes(value);
  let preference = "claro", persisted = false, storageAvailable = true;
  try {
    const saved = root.localStorage?.getItem(KEY);
    if (valid(saved)) { preference = saved; persisted = true; }
  } catch { storageAvailable = false; }
  let media;
  try { media = root.matchMedia?.("(prefers-color-scheme: dark)"); } catch { /* Sistema sin deteccion. */ }
  const listeners = new Set();
  let snapshot;
  function update() {
    const system = media?.matches ? "dark" : "light";
    const theme = preference === "automatico" ? system : preference === "oscuro" ? "dark" : "light";
    if (root.document) {
      root.document.documentElement.dataset.theme = theme;
      root.document.documentElement.style.colorScheme = theme;
    }
    if (snapshot?.preference === preference && snapshot.theme === theme && snapshot.system === system &&
        snapshot.persisted === persisted && snapshot.storageAvailable === storageAvailable) return;
    snapshot = Object.freeze({ preference, theme, system, persisted, storageAvailable });
    listeners.forEach(listener => listener());
  }
  function setPreference(value) {
    if (!valid(value)) return false;
    preference = value;
    try { root.localStorage.setItem(KEY, value); persisted = true; storageAvailable = true; }
    catch { persisted = false; storageAvailable = false; }
    update();
    return true;
  }
  update();
  if (media?.addEventListener) media.addEventListener("change", update);
  else media?.addListener?.(update);
  root.addEventListener?.("storage", event => {
    if (event.key !== KEY && event.key !== null) return;
    try { if (event.storageArea && event.storageArea !== root.localStorage) return; }
    catch { return; }
    preference = valid(event.newValue) ? event.newValue : "claro";
    persisted = valid(event.newValue);
    update();
  });
  root.HostFlowAppearance = Object.freeze({ KEY, setPreference,
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
})(globalThis);
