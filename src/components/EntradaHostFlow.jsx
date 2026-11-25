import {lazy,Suspense} from 'react';
const App=lazy(()=>import('../App.jsx'));
const DemoPublica=lazy(()=>import('../pages/DemoPublica.jsx'));
const RegistroClientes=lazy(()=>import('../pages/RegistroClientes.jsx'));
const VerificarCorreoClientes=lazy(()=>import('../pages/VerificarCorreoClientes.jsx'));
const LoginClientes=lazy(()=>import('../pages/LoginClientes.jsx'));
const AccesoPublico=lazy(()=>import('../pages/AccesoPublico.jsx'));

// Las entradas públicas dedicadas se montan sin el proveedor comercial ni la aplicación operativa.
export default function EntradaHostFlow({esDemo,esRegistro,esLoginClientes,esAccesoPublico,entradaVerificacion,entradaComercial}){
 let contenido=<App entradaComercial={entradaComercial}/>;
 if (esDemo) contenido=<DemoPublica/>;
 if (esRegistro) contenido=<RegistroClientes/>;
 if (esLoginClientes) contenido=<LoginClientes/>;
 if (esAccesoPublico) contenido=<AccesoPublico/>;
 if (entradaVerificacion) contenido=<VerificarCorreoClientes token={entradaVerificacion.token}/>;
 return <Suspense fallback={<div className="hf-arranque" role="status">Preparando HostFlow…</div>}>
  {contenido}
 </Suspense>;
}
