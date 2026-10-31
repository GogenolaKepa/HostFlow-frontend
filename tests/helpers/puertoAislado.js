import {createServer} from 'node:net';
// Vite interpreta port:0 como su puerto por defecto: reservar uno efímero explícito.
export async function puertoAislado(){
  const s=createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
  const port=s.address().port;await new Promise(r=>s.close(r));
  if([4000,5173].includes(port))throw Error('Puerto operativo excluido del laboratorio.');
  return port; // strictPort evita que una carrera derive a otro servicio.
}
