import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("La apariencia requiere ThemeProvider.");
  return context;
}
