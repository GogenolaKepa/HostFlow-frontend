// Entrada exclusiva E2E. Mismas App/Login/Usuarios/componentes del producto,
// HTTP REAL vía proxy loopback. La excepción de transporte no existe en src/.
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../../src/App';
import {ThemeProvider} from '../../../src/context/ThemeContext';
import {crearConexionComercial,prepararEntradaComercial} from '../../../src/services/conexionComercialPreparada';
import {obtenerToken} from '../../../src/services/session';
import '../../../src/styles/theme.css';
import '../../../src/styles/settings.css';
import '../../../src/styles/workspace.css';
import '../../../src/styles/accessibility.css';
const entrada=prepararEntradaComercial(location.href,url=>history.replaceState(null,'',url));
const conexion=crearConexionComercial({origen:'https://cuentas.example.invalid',obtenerToken,
  transportar:(url,opciones)=>{const u=new URL(url);return fetch(u.pathname+u.search,opciones);}});
createRoot(document.getElementById('root')).render(<ThemeProvider><App entradaComercial={entrada} conexionComercial={conexion}/></ThemeProvider>);
