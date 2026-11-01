import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export async function abrirNavegador(browserPath) {
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'hf-cuentas-browser-'));
  const child=spawn(browserPath,['--headless=new','--disable-gpu','--disable-background-networking','--disable-sync','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let socket;
  function endpointDelPerfil(){try{const [puerto,ruta]=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);if(!/^\d{1,5}$/.test(puerto)||Number(puerto)<1||Number(puerto)>65535||!/^\/devtools\/browser\/[a-f0-9-]+$/i.test(ruta))return null;return `ws://127.0.0.1:${puerto}${ruta}`;}catch{return null;}}
  async function cerrarPerfil(){const url=endpointDelPerfil();if(!url)return;await new Promise(resolve=>{const w=new WebSocket(url),fin=()=>{clearTimeout(timer);w.close();resolve();};const timer=setTimeout(fin,3000);w.addEventListener('open',()=>w.send(JSON.stringify({id:1,method:'Browser.close'})));w.addEventListener('close',()=>{clearTimeout(timer);resolve();},{once:true});w.addEventListener('error',fin,{once:true});});}
  function limpiarPerfil(){const absoluto=path.resolve(profile);if(path.dirname(absoluto)!==path.resolve(os.tmpdir())||!path.basename(absoluto).startsWith('hf-cuentas-browser-'))throw Error('Perfil fuera del temporal previsto.');try{fs.rmSync(absoluto,{recursive:true,force:true});}catch{/* No forzar archivos bloqueados por un proceso aún cerrándose. */}}
  try {
    const url=await new Promise((resolve,reject)=>{
      let terminado=false;const fin=(error,url)=>{if(terminado)return;terminado=true;clearTimeout(timer);clearInterval(poll);if(error)reject(error);else resolve(url);};
      const timer=setTimeout(()=>fin(Error('Navegador aislado no inició.')),20000);
      // Edge puede relanzarse sin heredar stderr; leer solo el endpoint del perfil propio.
      const poll=setInterval(()=>{const u=endpointDelPerfil();if(u)fin(null,u);},100);
      child.once('error',()=>fin(Error('No se pudo abrir el navegador.')));
      child.stderr.on('data',data=>{const m=/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/.exec(String(data));if(m)fin(null,m[1]);});
    });
    socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let id=0;const pending=new Map(),handlers=new Map();
    socket.addEventListener('message',({data})=>{const r=JSON.parse(data);if(r.id){const p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);if(r.error)p.reject(Error('Error CDP del laboratorio.'));else p.resolve(r.result);}}else handlers.get(r.method)?.(r.params);});
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout de navegador aislado.'));},10000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const command=(m,p)=>send(m,p,sessionId);
    const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Error DOM del laboratorio.');return r.result.value;};
    const esperar=async expr=>{for(let n=0;n<100;n++){if(await evaluate(expr))return;await new Promise(r=>setTimeout(r,60));}throw Error('Condición del laboratorio no alcanzada.');};
    return {command,evaluate,esperar,on:(m,h)=>handlers.set(m,h),async cerrar(){try{await send('Browser.close');}catch{}socket.close();if(child.exitCode===null){await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,1500))]);if(child.exitCode===null)child.kill();}limpiarPerfil(); }};
  }catch(e){await cerrarPerfil();socket?.close();if(child.exitCode===null)child.kill();limpiarPerfil();throw e;}
}
