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
import { iniciarEncuadreMovil } from './services/encuadreMovil';
import { prepararEntradaVerificacion } from './services/entradaVerificacionClientes';

// Retirar secretos de la URL antes del primer render y de cualquier petición.
const esDemo=['/demo','/demo/'].includes(window.location.pathname);
const esRegistro=window.location.pathname==='/clientes/registro';
const esLoginClientes=window.location.pathname==='/clientes/login';
const esAccesoPublico=window.location.pathname==='/acceso';
const entradaVerificacion=prepararEntradaVerificacion(window.location.href,
  url=>window.history.replaceState(null,'',url));
const entradaDedicada=esDemo||esRegistro||esLoginClientes||esAccesoPublico||entradaVerificacion;
const entradaComercial=entradaDedicada?null:prepararEntradaComercial(window.location.href,
  url=>window.history.replaceState(null,'',url));
const contenedor = document.getElementById('root');
if (!entradaDedicada) iniciarEncuadreMovil(contenedor);

createRoot(contenedor).render(
  <StrictMode>
    <ThemeProvider><PreferenciasNavegadorBootstrap /><EntradaHostFlow esDemo={esDemo} esRegistro={esRegistro} esLoginClientes={esLoginClientes} esAccesoPublico={esAccesoPublico} entradaVerificacion={entradaVerificacion} entradaComercial={entradaComercial}/></ThemeProvider>
  </StrictMode>
);
