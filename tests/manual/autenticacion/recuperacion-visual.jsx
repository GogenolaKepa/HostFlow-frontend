// Entrada exclusiva de pruebas. Ningún transporte, backend o envío real.
import {createRoot} from 'react-dom/client';
import {SolicitarRecuperacion,ConfirmarCuenta} from '../../../src/components/autenticacion/ExperienciaComercial';
import {EntradaComercialPreparada} from '../../../src/components/autenticacion/EntradaComercialPreparada';
import '../../../src/styles/theme.css';
import '../../../src/styles/settings.css';
import '../../../src/styles/workspace.css';
import '../../../src/styles/accessibility.css';
import '../../../src/styles/monedas.css';
import '../../../src/styles/page-polish.css';
import '../../../src/styles/reportes-monedas-visual.css';

const params=new URLSearchParams(location.search),pantalla=params.get('pantalla')||'solicitar',estado=params.get('estado')||'lista';
const fixture={llamadas:[],volver:0};window.__recuperacionVisual=fixture;
const error=codigo=>Object.assign(Error(codigo==='INCIERTO'?'No pudimos confirmar el resultado. No repitas la operación.':'No pudimos completar la operación. Intentá nuevamente más tarde.'),{codigo});
const esperar=()=>new Promise(()=>{});
const cliente={
 solicitar:async()=>{fixture.llamadas.push('solicitar');if(estado==='cargando')return esperar();if(estado==='error')throw error('NO_DISPONIBLE');if(estado==='incierto')throw error('INCIERTO');return 'aceptada-ficticia';},
 validar:async()=>{fixture.llamadas.push('validar');if(estado==='validando')return esperar();if(estado==='vencido')throw error('ENLACE_INVALIDO');if(estado==='error-enlace')throw error('NO_DISPONIBLE');return true;},
 confirmar:async()=>{fixture.llamadas.push('confirmar');if(estado==='cargando')return esperar();if(estado==='error')throw error('NO_DISPONIBLE');if(estado==='incierto')throw error('INCIERTO');return undefined;}
};
const volver=()=>{fixture.volver++;};
const token='F'.repeat(43); // Sintácticamente válido; no corresponde a ninguna cuenta ni servicio.
const tipo=pantalla==='invitacion'?'invitaciones':'recuperacion';
const contenido=pantalla==='entrada'
 ? <EntradaComercialPreparada entrada={{tipo:'solicitar'}} volver={volver} conexion={{cliente,capacidades:()=>estado==='cargando'?esperar():Promise.resolve({recuperacion:false,invitaciones:false})}}/>
 : pantalla==='solicitar'?<SolicitarRecuperacion cliente={cliente} volver={volver}/>
 : <ConfirmarCuenta tipo={tipo} tokenInicial={estado==='invalido'?'invalido':token} cliente={cliente} volver={volver}/>;
createRoot(document.getElementById('root')).render(contenido);
