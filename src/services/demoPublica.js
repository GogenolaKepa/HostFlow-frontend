// Escenario público sintético. Sin API, JWT, proveedores ni almacenamiento.
export const MES_DEMO='2026-11';
export const FECHA_DEMO='2026-11-12';
const proteger=obj=>{if(obj&&typeof obj==='object'){Object.values(obj).forEach(proteger);Object.freeze(obj);}return obj;};
export const escenarioDemo=proteger({
 propiedades:[
  {id:'demo-p1',nombre:'Loft del Parque',tipo:'Departamento',capacidad:2,estado:'Activa',moneda:'USD',tarifa:85,descripcion:'Un espacio luminoso para una escapada urbana.',color:'azul'},
  {id:'demo-p2',nombre:'Casa del Jardín',tipo:'Casa',capacidad:4,estado:'Activa',moneda:'ARS',tarifa:120000,descripcion:'Espacios amplios para compartir una estadía en familia.',color:'verde'},
  {id:'demo-p3',nombre:'Estudio del Sol',tipo:'Estudio',capacidad:2,estado:'Activa',moneda:'USD',tarifa:65,descripcion:'Un estudio tranquilo, simple y funcional.',color:'ambar'},
  {id:'demo-p4',nombre:'Cabaña del Bosque',tipo:'Cabaña',capacidad:6,estado:'Mantenimiento',moneda:'ARS',tarifa:150000,descripcion:'Un alojamiento rodeado de naturaleza.',color:'violeta'},
 ],
 huespedes:[
  {id:'demo-h1',nombre:'Valentina Demo',origen:'Manual'},
  {id:'demo-h2',nombre:'Nicolás Ejemplo',origen:'Booking simulado'},
  {id:'demo-h3',nombre:'Lucía Ficticia',origen:'Airbnb simulado'},
  {id:'demo-h4',nombre:'Martín Demo',origen:'Manual'},
  {id:'demo-h5',nombre:'Sofía Ejemplo',origen:'Manual'},
 ],
 reservas:[
  {id:'demo-r1',propiedad:'demo-p1',huesped:'demo-h1',ingreso:'2026-11-03',egreso:'2026-11-07',horaIngreso:'15:00',horaEgreso:'10:00',personas:2,estado:'Finalizada',canal:'Manual',moneda:'USD',importe:340},
  {id:'demo-r2',propiedad:'demo-p2',huesped:'demo-h2',ingreso:'2026-11-10',egreso:'2026-11-15',horaIngreso:'15:00',horaEgreso:'10:00',personas:3,estado:'Confirmada',canal:'Booking simulado',moneda:'ARS',importe:600000},
  {id:'demo-r3',propiedad:'demo-p1',huesped:'demo-h3',ingreso:'2026-11-14',egreso:'2026-11-18',horaIngreso:'15:00',horaEgreso:'10:00',personas:2,estado:'Confirmada',canal:'Airbnb simulado',moneda:'USD',importe:340},
  {id:'demo-r4',propiedad:'demo-p3',huesped:'demo-h4',ingreso:'2026-11-12',egreso:'2026-11-14',horaIngreso:'16:00',horaEgreso:'11:00',personas:1,estado:'Confirmada',canal:'Manual',moneda:'USD',importe:130},
  {id:'demo-r5',propiedad:'demo-p2',huesped:'demo-h5',ingreso:'2026-11-20',egreso:'2026-11-23',horaIngreso:'15:00',horaEgreso:'10:00',personas:4,estado:'Confirmada',canal:'Manual',moneda:'ARS',importe:360000},
  {id:'demo-r6',propiedad:'demo-p3',huesped:'demo-h2',ingreso:'2026-11-22',egreso:'2026-11-24',horaIngreso:'15:00',horaEgreso:'10:00',personas:2,estado:'Cancelada',canal:'Booking simulado',moneda:'USD',importe:130},
  {id:'demo-r7',propiedad:'demo-p1',huesped:'demo-h5',ingreso:'2026-12-04',egreso:'2026-12-07',horaIngreso:'15:00',horaEgreso:'10:00',personas:2,estado:'Confirmada',canal:'Manual',moneda:'USD',importe:255},
  {id:'demo-r8',propiedad:'demo-p2',huesped:'demo-h1',ingreso:'2026-12-10',egreso:'2026-12-13',horaIngreso:'15:00',horaEgreso:'10:00',personas:3,estado:'Confirmada',canal:'Airbnb simulado',moneda:'ARS',importe:360000},
 ],
 limpiezas:[
  {id:'demo-l1',propiedad:'demo-p1',fecha:'2026-11-07',hora:'11:00',estado:'Completada',prioridad:'Normal'},
  {id:'demo-l2',propiedad:'demo-p3',fecha:'2026-11-14',hora:'11:30',estado:'Pendiente',prioridad:'Alta'},
  {id:'demo-l3',propiedad:'demo-p2',fecha:'2026-11-15',hora:'11:00',estado:'Programada',prioridad:'Normal'},
 ],
 avisos:[
  {id:'demo-a1',tipo:'Alerta',titulo:'Preparar el próximo ingreso',texto:'Revisar la tarea del Estudio del Sol antes de la siguiente llegada.',seccion:'limpiezas',prioridad:'Alta',leida:false},
  {id:'demo-a2',tipo:'Notificación',titulo:'Nueva reserva en la agenda',texto:'La reserva ficticia del Loft del Parque ya está en el calendario de ejemplo.',seccion:'reservas',prioridad:'Informativa',leida:false},
  {id:'demo-a3',tipo:'Alerta',titulo:'Alojamiento en mantenimiento',texto:'La Cabaña del Bosque está fuera de disponibilidad en este escenario.',seccion:'propiedades',prioridad:'Normal',leida:true},
 ],
});
export function crearEstadoDemo(){return {limpiezas:escenarioDemo.limpiezas.map(x=>({...x})),avisos:escenarioDemo.avisos.map(x=>({...x}))};}
export function reducirDemo(estado,accion){
 if(accion.tipo==='reiniciar')return crearEstadoDemo();
 if(accion.tipo==='limpieza')return {...estado,limpiezas:estado.limpiezas.map(x=>x.id===accion.id?{...x,estado:x.estado==='Completada'?x.estado:x.estado==='En progreso'?'Completada':'En progreso'}:x)};
 if(accion.tipo==='leer')return {...estado,avisos:estado.avisos.map(x=>x.id===accion.id?{...x,leida:true}:x)};
 return estado;
}
export function mesAdyacente(mes,delta){const [y,m]=mes.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);}
export function diasDelMes(mes){const [y,m]=mes.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate();}
export function reservasDelMes(mes){const fin=mesAdyacente(mes,1)+'-01';return escenarioDemo.reservas.filter(r=>r.ingreso<fin&&r.egreso>mes+'-01');}
export function filtrarReservasDemo({mes=MES_DEMO,busqueda='',estado='Todos',propiedad='Todas'}={}){
 const texto=busqueda.trim().toLocaleLowerCase('es-AR');
 return reservasDelMes(mes).filter(r=>(estado==='Todos'||r.estado===estado)&&(propiedad==='Todas'||r.propiedad===propiedad)&&(!texto||[r.id,escenarioDemo.propiedades.find(p=>p.id===r.propiedad).nombre,escenarioDemo.huespedes.find(h=>h.id===r.huesped).nombre,r.canal].join(' ').toLocaleLowerCase('es-AR').includes(texto)));
}
export function resumenDemo(mes){
 const reservas=reservasDelMes(mes),activas=escenarioDemo.propiedades.filter(p=>p.estado==='Activa');
 const noches=new Set();
 for(const r of reservas.filter(r=>['Confirmada','Finalizada'].includes(r.estado)))for(let d=1;d<=diasDelMes(mes);d++){
  const fecha=mes+'-'+String(d).padStart(2,'0');if(fecha>=r.ingreso&&fecha<r.egreso)noches.add(r.propiedad+':'+fecha);
 }
 const disponibles=activas.length*diasDelMes(mes);
 return {reservas:reservas.length,propiedades:activas.length,noches:noches.size,disponibles,ocupacion:disponibles?Math.round(noches.size/disponibles*100):0};
}
export function distribucionDemo(mes){return ['Manual','Booking simulado','Airbnb simulado'].map(etiqueta=>({etiqueta,valor:String(reservasDelMes(mes).filter(r=>r.canal===etiqueta).length)}));}
export const nombrePropiedad=id=>escenarioDemo.propiedades.find(p=>p.id===id)?.nombre||'Alojamiento de ejemplo';
export const nombreHuesped=id=>escenarioDemo.huespedes.find(p=>p.id===id)?.nombre||'Persona ficticia';
export const fechaDemo=iso=>new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));
export const nombreMes=mes=>new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(mes+'-01T12:00:00Z'));
