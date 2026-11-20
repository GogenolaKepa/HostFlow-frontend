import {lazy,Suspense} from 'react';
const App=lazy(()=>import('../App.jsx'));
const DemoPublica=lazy(()=>import('../pages/DemoPublica.jsx'));
const RegistroClientes=lazy(()=>import('../pages/RegistroClientes.jsx'));
const VerificarCorreoClientes=lazy(()=>import('../pages/VerificarCorreoClientes.jsx'));

// Las entradas públicas dedicadas se montan sin el proveedor comercial ni la aplicación operativa.
export default function EntradaHostFlow({esDemo,esRegistro,entradaVerificacion,entradaComercial}){
 let contenido=<App entradaComercial={entradaComercial}/>;
 if (esDemo) contenido=<DemoPublica/>;
 if (esRegistro) contenido=<RegistroClientes/>;
 if (entradaVerificacion) contenido=<VerificarCorreoClientes token={entradaVerificacion.token}/>;
 return <Suspense fallback={<div role="status" style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Preparando HostFlow…</div>}>
  {contenido}
 </Suspense>;
}
