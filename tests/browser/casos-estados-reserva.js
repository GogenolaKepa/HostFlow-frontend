import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {reservaVisual} from '../fixtures/visual-modulos.js';
export async function probarEstadosReserva({t,fixture,login,esperar,inicioVisible,send,evaluate,requests,fase}) {
  fixture({rol:'Administrador',datosVisuales:true,reservasEstabilizacion:[{...reservaVisual,finalizacionPendiente:true},{...reservaVisual,idReserva:2,finalizacionPendiente:false}]});
  await login();await esperar(inicioVisible);await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");const desde=requests.length;
  await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()==='Reservas').click()");await esperar("document.querySelectorAll('.reserva-estados').length===4");
  const out=path.resolve('../revision/pulido-premium-2026-10-29');fs.mkdirSync(out,{recursive:true});
  for(const width of [1280,390,320])await t.test(`Estados de reserva ${width}`,async()=>{
    fase('estados '+width);await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    const raiz=width<600?'.reservas-mobile-list':'.reservas-desktop-list';
    assert.equal(await evaluate(`document.querySelectorAll('${raiz} .reserva-finalizacion-pendiente').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('${raiz} .estado.confirmada').length`),2);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    assert.equal(await evaluate(`(()=>{const e=document.querySelector('${raiz} .reserva-finalizacion-pendiente'),p=e.parentElement,r=e.getBoundingClientRect(),q=p.getBoundingClientRect();return r.left>=q.left-1&&r.right<=q.right+1;})()`),true);
    const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'reservas-'+width+'.png'),Buffer.from(data,'base64'));
  });
  assert.ok(requests.slice(desde).every(r=>['GET','OPTIONS'].includes(r.method)));
}
