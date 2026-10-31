// Lanzador opt-in, solo loopback y fixtures. Nunca npm run dev operativo.
import {iniciarLaboratorioComercial} from '../../helpers/laboratorioComercial.js';
const lab=await iniciarLaboratorioComercial();
console.log(`Laboratorio HostFlow FICTICIO, sin Azure ni email real: ${lab.base}`);
console.log('Cuenta ficticia para recuperar: 2@example.invalid. El botón de correo abre el enlace ficticio. Ctrl+C para cerrar.');
let cerrando=false;
async function cerrar(){if(cerrando)return;cerrando=true;await lab.cerrar();process.exitCode=0;}
process.once('SIGINT',cerrar);process.once('SIGTERM',cerrar);
