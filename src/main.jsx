import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles/theme.css";
import "./styles/settings.css";
import "./styles/workspace.css";

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <ThemeProvider><App /></ThemeProvider>
  </StrictMode>
);
