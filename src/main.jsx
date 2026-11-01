import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles/theme.css";
import "./styles/settings.css";
import "./styles/workspace.css";
import "./styles/accessibility.css";
import './styles/monedas.css';
import './styles/page-polish.css';
import './styles/reportes-monedas-visual.css';
import { PreferenciasNavegadorBootstrap } from "./components/configuracion/PreferenciasGenerales";
import {prepararEntradaComercial} from './services/conexionComercialPreparada';

// Retirar secretos de la URL antes del primer render y de cualquier petición.
const entradaComercial=prepararEntradaComercial(window.location.href,
  url=>window.history.replaceState(null,'',url));

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <ThemeProvider><PreferenciasNavegadorBootstrap /><App entradaComercial={entradaComercial}/></ThemeProvider>
  </StrictMode>
);
