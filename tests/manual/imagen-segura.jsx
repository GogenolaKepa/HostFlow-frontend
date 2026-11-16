import {createRoot} from 'react-dom/client';import Imagen from '../../src/components/ImagenPropiedadSegura';import api from '../../src/services/api';import {SESION_CERRADA} from '../../src/services/session';
api.defaults.baseURL='https://api.hostflow.com.ar/api';
window.fixture={llamadas:0,revocadas:0};const revocar=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{window.fixture.revocadas++;revocar(u);};
api.get=async()=>{window.fixture.llamadas++;return {data:new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9K8AAAAASUVORK5CYII='),x=>x.charCodeAt(0))],{type:'image/png'})};};
createRoot(document.getElementById('root')).render(<><Imagen src="https://api.hostflow.com.ar/uploads/propiedades/1/ficticia.png" alt="Imagen ficticia"/><button onClick={()=>window.dispatchEvent(new Event(SESION_CERRADA))}>Cerrar sesión ficticia</button></>);
