import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {reservaVisual} from '../fixtures/visual-modulos.js';
export async function probarEstadosReserva({t,fixture,login,esperar,inicioVisible,send,evaluate,requests,fase}) {
  const largo='Visitante ficticio con un nombre extenso y apellidos de prueba';
  const nombrePropiedad='Alojamiento ficticio '+ 'ExtraordinariamenteLargo'.repeat(4);
  const filas=[
    {...reservaVisual,montoEstimado:200,acuerdoMonetario:{moneda:'USD',importe:'200.00'},accionesDisponibles:['VER','EDITAR','CANCELAR']},
    {...reservaVisual,idReserva:2,huesped:largo,propiedad:nombrePropiedad,finalizacionPendiente:true},
    {...reservaVisual,idReserva:3,estado:'Cancelada',accionesDisponibles:['VER']},
    {...reservaVisual,idReserva:4,estado:'No show',canal:'Booking',accionesDisponibles:['VER']},
    {...reservaVisual,idReserva:5,canal:'Airbnb',accionesDisponibles:['VER','PROPONER_CAMBIO','ABRIR_EN_CANAL']},
    {...reservaVisual,idReserva:6,canal:'Booking',accionesDisponibles:['VER','GESTIONAR_BOOKING','ABRIR_EN_CANAL']},
  ];
  fixture({rol:'Administrador',datosVisuales:true,reservasEstabilizacion:filas});
  await login();await esperar(inicioVisible);await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");const desde=requests.length;
  await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()==='Reservas').click()");await esperar("document.querySelectorAll('.reserva-estados').length===12");
  const out=path.resolve('../revision/reservas-tabla-premium-2026-10-29');fs.mkdirSync(out,{recursive:true});
  for(const width of [1920,1366,820,390,320])await t.test(`Listado premium ${width}: alineación, contenido, foco y responsive`,async()=>{
    fase('tabla '+width);await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=820});
    const raiz=width<=1100?'.reservas-mobile-list':'.reservas-desktop-list';
    assert.equal(await evaluate(`document.querySelector('${raiz}').getClientRects().length>0`),true);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    assert.equal(await evaluate("(()=>{const b=[...document.querySelectorAll('.reservas-header-actions button')];return b.every((e,i)=>{const r=e.getBoundingClientRect();return b.slice(i+1).every(o=>{const s=o.getBoundingClientRect();return r.right<=s.left+1||s.right<=r.left+1||r.bottom<=s.top+1||s.bottom<=r.top+1;});});})()"),true,'Acciones de cabecera sin superposición');
    assert.equal(await evaluate(`document.querySelectorAll('${raiz} .estado.confirmada').length`),4);
    assert.equal(await evaluate(`document.querySelectorAll('${raiz} .estado.cancelada').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('${raiz} .estado.no-show').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('${raiz} .reserva-finalizacion-pendiente').length`),1);
    const texto=await evaluate(`document.querySelector('${raiz}').textContent`);
    assert.ok(texto.includes(largo)&&texto.includes(nombrePropiedad));
    assert.match(texto,/Acuerdo contractual: USD 200,00/);assert.match(texto,/moneda no declarada/);
    assert.equal(await evaluate(`(()=>{const root=document.querySelector('${raiz}');return [...root.querySelectorAll('.reserva-estados > span,button,.reserva-importes')].every(e=>{const r=e.getBoundingClientRect(),p=e.closest('td,.reservas-mobile-card').getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;});})()`),true,'Contenidos dentro de su celda/tarjeta');
    if(width>1100){
      const geometria=await evaluate(`(()=>{const t=document.querySelector('${raiz} table'),h=[...t.querySelectorAll('th')];return [...t.querySelectorAll('tbody tr')].every(tr=>[...tr.cells].every((c,i)=>{const r=c.getBoundingClientRect(),s=h[i].getBoundingClientRect();return Math.abs((r.left+r.right-s.left-s.right)/2)<1&&getComputedStyle(c).textAlign==='center'&&getComputedStyle(c).verticalAlign==='middle';})&&[...tr.querySelectorAll('.reserva-estados > span')].every(e=>{const r=e.getBoundingClientRect(),c=e.closest('td').getBoundingClientRect();return Math.abs((r.left+r.right-c.left-c.right)/2)<1;}));})()`);
      assert.equal(geometria,true,'Ejes reales de encabezados, celdas y chips alineados');
    }
    assert.equal(await evaluate(`(()=>{const b=[...document.querySelectorAll('${raiz} button')];return b.every((e,i)=>{const r=e.getBoundingClientRect();return b.slice(i+1).every(o=>{const s=o.getBoundingClientRect();return r.right<=s.left+1||s.right<=r.left+1||r.bottom<=s.top+1||s.bottom<=r.top+1;});});})()`),true,'Botones sin superposición');
    await evaluate('window.scrollTo(0,0)');const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'reservas-'+width+'.png'),Buffer.from(data,'base64'));
    await evaluate(`document.querySelector('${raiz} button').focus()`);
    assert.equal(await evaluate(`document.activeElement===document.querySelector('${raiz} button')`),true);
    assert.equal(await evaluate("getComputedStyle(document.activeElement).outlineStyle"),'solid');
  });
  assert.ok(requests.slice(desde).every(r=>['GET','OPTIONS'].includes(r.method)));
}
