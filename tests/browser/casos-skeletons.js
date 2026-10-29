import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function probarSkeletons({t,send,evaluate,esperar,click,login,inicioVisible,requests,excepciones,configurar,fase}) {
  const out=path.resolve('../revision/skeleton-integral-2026-10-29');fs.mkdirSync(out,{recursive:true});
  const resultados=[];
  const pantallas=[['Inicio','dashboard'],['Propiedades','propiedades'],['Reservas','reservas'],['Limpiezas','limpiezas'],['Huéspedes','huespedes'],['Calendario','calendario'],['Reportes','reportes'],['Preferencias operativas','formulario'],['Datos de empresa','formulario'],['Notificaciones','formulario']];
  const nav=async nombre=>{
    if(['Preferencias operativas','Datos de empresa','Notificaciones'].includes(nombre)){
      await click('.sidebar-settings');await esperar("Boolean(document.querySelector('.settings-nav'))");
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.trim()==="+JSON.stringify(nombre)+").click()");
    }else await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()==="+JSON.stringify(nombre)+").click()");
  };
  const shot=async nombre=>{const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,nombre+'.png'),Buffer.from(data,'base64'));};
  const recargar=async()=>{await evaluate("document.body.dataset.cargaAnterior='1'");await send('Page.reload');await esperar("Boolean(document.body)&&!document.body.dataset.cargaAnterior&&Boolean(document.querySelector('.sidebar'))");};
  configurar();await login();await esperar(inicioVisible);
  for(const width of [1280,390]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    for(const [nombre,variante]of pantallas)await t.test(`skeleton ${nombre} ${width}`,async()=>{
      fase(nombre+' '+width);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});configurar({demora:1800});
      if(nombre==='Inicio')await recargar();else await nav(nombre);
      await esperar("Boolean(document.querySelector('.hf-skeleton--"+variante+"'))");
      if(nombre==='Notificaciones')await esperar("Boolean(document.querySelector('.notification-settings .hf-skeleton'))");
      await evaluate("document.documentElement.dataset.theme='dark';document.documentElement.dataset.reduceMotion='false'");
      assert.equal(await evaluate("Boolean(document.querySelector('.sidebar') && document.querySelector('.mobile-appbar'))"),true);
      const medir=()=>evaluate("(()=>{const r=document.querySelector('.main').getBoundingClientRect();return {x:r.x,w:r.width}})()");
      const antes=await medir();await new Promise(r=>setTimeout(r,400));
      assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hf-skeleton-visual')).opacity"),'1');
      const trans=()=>evaluate("getComputedStyle(document.querySelector('.hf-skeleton-trazo'),'::after').transform");
      const a=await trans();await new Promise(r=>setTimeout(r,90));const b=await trans();assert.equal(await evaluate("getComputedStyle(document.querySelector('.hf-skeleton-trazo'),'::after').animationName"),'hf-skeleton-brillo');
      if(a===b)throw new Error('Shimmer inmovil: '+JSON.stringify(await evaluate("({reducido:matchMedia('(prefers-reduced-motion: reduce)').matches,local:document.documentElement.dataset.reduceMotion,display:getComputedStyle(document.querySelector('.hf-skeleton-trazo'),'::after').display,duration:getComputedStyle(document.querySelector('.hf-skeleton-trazo'),'::after').animationDuration})")));
      await shot(nombre+'-'+width);
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hf-skeleton-trazo'),'::after').animationName"),'none');
      await send('Emulation.setEmulatedMedia',{features:[]});
      await esperar("!document.querySelector('.hf-skeleton')");
      assert.deepEqual(antes,await medir(),'Marco estable');
      assert.equal(await evaluate("Boolean(document.querySelector('[role=dialog]'))"),false);
      if(variante==='formulario')assert.equal(await evaluate("document.querySelector('.settings-content').innerText.includes('sin guardar')"),false);
      resultados.push({nombre,width,carga:true,marcoEstable:true,movimientoReducido:true});configurar();
    });
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  for(const modo of ['error','vacio','rapida'])for(const [nombre]of pantallas)await t.test(`${modo} ${nombre}`,async()=>{
    fase(modo+' '+nombre);configurar();await recargar();await esperar(inicioVisible);
    configurar({modo:modo==='rapida'?'datos':modo,demora:modo==='rapida'?0:200});
    if(nombre==='Inicio')await recargar();else await nav(nombre);
    await new Promise(r=>setTimeout(r,750));await esperar("!document.querySelector('.hf-skeleton')");
    const texto=await evaluate("document.querySelector('.main').innerText");assert.ok(texto.length>10);
    if(modo==='error')assert.match(texto,/no se|fallo|error|no pudimos|no disponible/i);
    if(modo==='vacio' && ['Reservas','Limpiezas','Calendario'].includes(nombre))assert.match(texto,/no hay|no encontramos/i);
    assert.equal(await evaluate("Boolean(document.querySelector('[role=dialog]'))"),false);
    await evaluate("document.documentElement.dataset.theme='dark'");await shot(modo+'-'+nombre);
    resultados.push({modo,nombre,contenido:true});
  });
  assert.equal(excepciones.length,0);assert.ok(requests.every(r=>['GET','OPTIONS'].includes(r.method)||r.ruta==='/auth/login'));
  fs.writeFileSync(path.join(out,'resultados.json'),JSON.stringify(resultados,null,2));
}
