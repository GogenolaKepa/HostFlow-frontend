import {lazy,Suspense} from 'react';
const App=lazy(()=>import('../App.jsx'));
const DemoPublica=lazy(()=>import('../pages/DemoPublica.jsx'));

// La ruta demo nunca monta el proveedor comercial, la sesión o páginas operativas.
export default function EntradaHostFlow({esDemo,entradaComercial}){
 return <Suspense fallback={<div role="status" style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Preparando HostFlow…</div>}>
  {esDemo?<DemoPublica/>:<App entradaComercial={entradaComercial}/>}
 </Suspense>;
}
