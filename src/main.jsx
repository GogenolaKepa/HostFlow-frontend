import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EntradaHostFlow from './components/EntradaHostFlow';
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
const esDemo=['/demo','/demo/'].includes(window.location.pathname);
const entradaComercial=esDemo?null:prepararEntradaComercial(window.location.href,
  url=>window.history.replaceState(null,'',url));

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <ThemeProvider><PreferenciasNavegadorBootstrap /><EntradaHostFlow esDemo={esDemo} entradaComercial={entradaComercial}/></ThemeProvider>
  </StrictMode>
);
