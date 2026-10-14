import { useSyncExternalStore } from "react";
import { ThemeContext } from "./theme";

// SSR no accede a almacenamiento del navegador. En cliente, index.html ya
// ejecuto el bootstrap sincrono antes de cargar React.
const serverSnapshot = Object.freeze({ preference: "claro", theme: "light", system: "light", persisted: false, storageAvailable: false });
const store = typeof document === "undefined" ? {
  getSnapshot: () => serverSnapshot, subscribe: () => () => {}, setPreference: () => false,
} : globalThis.HostFlowAppearance;

export function ThemeProvider({ children }) {
  const appearance = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <ThemeContext.Provider value={{ ...appearance, setPreference: store.setPreference }}>{children}</ThemeContext.Provider>;
}
