import {useState} from 'react';
import hero from '../assets/login/hero.webp';
import heroMobile from '../assets/login/hero-mobile.webp';
import {catalogoComercial,prepararSolicitudComercial,presentarModalidad} from '../services/catalogoComercial';
import '../styles/landing.css';
import ModalidadesComparadas from '../components/ModalidadesComparadas';

const iconos={
  casa:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',
  calendario:'M5 5h14v16H5zM8 3v4m8-4v4M5 10h14m-10 4h2m2 0h2m-6 3h2',
  personas:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8',
  grafico:'M4 3v18h17M8 16v-4m5 4V8m5 8V5',
  limpieza:'m6 20 7-12 4 2-7 12M13 8l3-5M5 20h7M4 11l1-2m15 6 1-2',
  escudo:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
  destello:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  flecha:'M4 12h16m-6-6 6 6-6 6',
};
function Icono({nombre,...props}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={iconos[nombre]||iconos.casa}/></svg>;}
const funciones=[
  {icono:'casa',titulo:'Cada alojamiento, en contexto',texto:'Propiedades y huéspedes con su información organizada. Menos búsquedas, una visión más clara.',etiquetas:['Propiedades','Huéspedes']},
  {icono:'calendario',titulo:'Reservas bajo control',texto:'Consultá fechas, disponibilidad y el historial de cada reserva desde un mismo espacio.',etiquetas:['Reservas','Calendario']},
  {icono:'limpieza',titulo:'El próximo ingreso empieza antes',texto:'Seguí las tareas entre una salida y la próxima llegada, con estados y prioridades visibles.',etiquetas:['Limpiezas']},
  {icono:'grafico',titulo:'Una operación que se entiende',texto:'Dashboard y reportes para leer ocupación, reservas e importes declarados, con ARS y USD separados.',etiquetas:['Dashboard','Reportes']},
  {icono:'destello',titulo:'Las señales, a la vista',texto:'Revisá alertas y notificaciones para saber qué necesita atención. Las sincronizaciones son acciones explícitas.',etiquetas:['Alertas','Notificaciones']},
  {icono:'personas',titulo:'Un equipo, roles claros',texto:'Organizá el acceso con perfiles Administrador y Operador, respetando los permisos de cada persona.',etiquetas:['Usuarios y permisos']},
];
const preguntas=[
  ['¿Qué es HostFlow?','Es una aplicación para centralizar la gestión de alojamientos temporarios: propiedades, huéspedes, reservas y seguimiento operativo.'],
  ['¿Para quién está pensado?','Para personas y equipos que necesitan organizar alojamientos y coordinar el trabajo cotidiano desde un panel.'],
  ['¿Cómo solicito acceso?','Prepará tu consulta en esta página y compartila con tu contacto de HostFlow. El acceso se coordina de forma asistida; no hay alta pública automática de empresas.'],
  ['¿Se conecta automáticamente con Booking y Airbnb?','Actualmente los recorridos multicanal utilizan simuladores. No se ofrece sincronización productiva automática con esos proveedores.'],
  ['¿Cómo se incorporan usuarios?','El producto distingue Administrador y Operador. La recuperación por correo y las invitaciones se están preparando para su activación supervisada; su disponibilidad debe confirmarse antes de contratar.'],
  ['¿Qué incluye cada plan y cuánto cuesta?','Las modalidades que ves son orientativas. El alcance, los límites y el precio se confirman en una propuesta. Esta página no cobra ni crea suscripciones.'],
  ['¿FlowIA envía datos a una IA externa?','El análisis operativo habitual funciona sin IA externa. Potenciarlo requiere consentimiento informado; la información de privacidad identifica al proveedor Google Gemini y permite conocer el alcance del envío.'],
];

function VistaProducto(){
  return <div className="hf-preview" aria-label="Vista ilustrativa del panel, con datos ficticios">
    <div className="hf-preview-top"><span className="hf-demo-logo">H<span>F</span></span><span>Tu espacio de trabajo</span><span className="hf-demo-badge">VISTA ILUSTRATIVA</span></div>
    <div className="hf-preview-body"><div className="hf-preview-menu" aria-hidden="true"><Icono nombre="casa"/><Icono nombre="calendario"/><Icono nombre="grafico"/><Icono nombre="personas"/></div>
      <div className="hf-preview-main"><div className="hf-preview-heading"><div><span>UNA VISIÓN MÁS CLARA</span><h3>Todo listo para el día.</h3></div><span className="hf-demo-dot">Tu operación</span></div>
        <div className="hf-preview-stats"><div><span>Alojamientos</span><strong>03</strong><small>En esta demostración</small></div><div><span>Próximas llegadas</span><strong>02</strong><small>Agenda del equipo</small></div><div><span>Tareas pendientes</span><strong>01</strong><small>Para revisar</small></div></div>
        <div className="hf-preview-reservas"><div className="hf-demo-section-label"><strong>Próximos movimientos</strong><span>Calendario</span></div><div><span className="hf-demo-home"><Icono nombre="casa"/></span><span><b>Casa del Río</b><small>Alojamiento de ejemplo</small></span><span className="hf-demo-state">Confirmada</span></div><div><span className="hf-demo-home"><Icono nombre="casa"/></span><span><b>Estudio Norte</b><small>Alojamiento de ejemplo</small></span><span className="hf-demo-state hf-demo-state-blue">Próximo ingreso</span></div></div>
        <div className="hf-preview-note"><Icono nombre="escudo"/><span>Datos ficticios. Esta vista no está conectada a una cuenta.</span></div>
      </div>
    </div>
  </div>;
}

export default function Landing(){
  const [menu,setMenu]=useState(false),[plan,setPlan]=useState(catalogoComercial.planes[0].id),[cantidad,setCantidad]=useState('');
  const [mensaje,setMensaje]=useState(''),[aviso,setAviso]=useState(''),[error,setError]=useState('');
  function seleccionar(id){setPlan(id);setMensaje('');setAviso('');setError('');}
  function preparar(e){e.preventDefault();setError('');setAviso('');try{setMensaje(prepararSolicitudComercial(plan,cantidad));}catch(err){setMensaje('');setError(err.message);}}
  async function copiar(){try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(mensaje);setAviso('Mensaje copiado. Podés compartirlo con tu contacto de HostFlow.');}catch{setAviso('Seleccioná y copiá el mensaje de abajo para compartirlo.');}}
  return <div className="hf-landing">
    <a className="hf-skip" href="#contenido-publico">Ir al contenido</a>
    <header className="hf-public-header"><a className="hf-public-brand" href="/" aria-label="HostFlow, inicio"><span className="hf-brand-symbol"><Icono nombre="casa"/></span>Host<span>Flow</span></a>
      <button className="hf-menu-toggle" type="button" aria-expanded={menu} aria-controls="hf-public-nav" onClick={()=>setMenu(!menu)}>{menu?'Cerrar menú':'Menú'}<span aria-hidden="true">{menu?'×':'☰'}</span></button>
      <nav id="hf-public-nav" className={menu?'is-open':''} aria-label="Navegación pública" onClick={()=>setMenu(false)} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);document.querySelector('.hf-menu-toggle')?.focus();}}}>
        <a href="#funcionalidades">El producto</a><a href="#como-funciona">Cómo funciona</a><a href="#planes">Modalidades</a><a href="#preguntas">Preguntas</a><a className="hf-nav-login" href="/login">Iniciar sesión <Icono nombre="flecha"/></a>
      </nav>
    </header>
    <main id="contenido-publico">
      <section className="hf-public-hero" aria-labelledby="hf-hero-title"><picture className="hf-hero-picture"><source media="(max-width: 700px)" srcSet={heroMobile}/><img src={hero} alt="" fetchPriority="high" width="1672" height="940"/></picture><div className="hf-hero-shade"/>
        <div className="hf-public-width hf-hero-content"><div className="hf-hero-copy"><span className="hf-eyebrow"><span/> GESTIÓN DE ALOJAMIENTOS</span><h1 id="hf-hero-title">Tu operación.<br/><em>En un solo lugar.</em></h1><p>Menos piezas sueltas. Más claridad para gestionar tus alojamientos, tus reservas y tu equipo.</p><div className="hf-hero-actions"><a className="hf-button hf-button-mint" href="/demo">Explorar demo <Icono nombre="flecha"/></a><a className="hf-button hf-button-glass" href="#planes">Ver planes</a></div><span className="hf-hero-footnote"><Icono nombre="escudo"/> Acceso controlado · Roles definidos · Tu gestión centralizada</span></div>
        <div className="hf-hero-caption"><span>DEL ALOJAMIENTO A LA OPERACIÓN</span><p>Un espacio para<br/>ver el panorama completo.</p></div></div>
      </section>
      <section className="hf-product-intro hf-public-width" aria-labelledby="hf-product-title"><div className="hf-section-heading"><div><span className="hf-eyebrow">PENSADO PARA EL DÍA A DÍA</span><h2 id="hf-product-title">Todo conectado.<br/><span>Todo más claro.</span></h2></div><p>Una reserva no termina en el calendario. También es una llegada, una tarea y una decisión. HostFlow reúne ese contexto.</p></div><VistaProducto/></section>
      <section id="funcionalidades" className="hf-features hf-public-width" aria-labelledby="hf-features-title"><div className="hf-section-heading"><div><span className="hf-eyebrow">UN PANEL, TODA TU OPERACIÓN</span><h2 id="hf-features-title">El orden que tu<br/>gestión necesita.</h2></div><p>Herramientas concretas para organizar la información, coordinar tareas y acompañar cada estadía.</p></div><div className="hf-feature-grid">{funciones.map(f=><article className="hf-feature" key={f.titulo}><span className="hf-feature-icon"><Icono nombre={f.icono}/></span><h3>{f.titulo}</h3><p>{f.texto}</p><div>{f.etiquetas.map(x=><span key={x}>{x}</span>)}</div></article>)}</div></section>
      <section className="hf-flow-section hf-public-width" aria-labelledby="hf-flow-title"><div className="hf-flow-mark" aria-hidden="true"><Icono nombre="destello"/></div><div><span className="hf-eyebrow">CONOCÉ FLOWIA</span><h2 id="hf-flow-title">Más contexto.<br/>Mejores decisiones.</h2><p>Recomendaciones a partir de tu operación, con una lectura clara de lo que necesita atención. El análisis habitual no requiere IA externa.</p><details><summary>Vos decidís cuándo potenciar el análisis</summary><p>La IA externa es opcional y requiere consentimiento informado antes del envío. La información de privacidad identifica a Google Gemini. Las recomendaciones no cambian reservas ni tarifas automáticamente.</p></details></div><div className="hf-flow-visual" aria-hidden="true"><span>Análisis operativo</span><div><i/><b>Organización</b><small>Información en contexto</small></div><div><i/><b>Seguimiento</b><small>Señales para revisar</small></div><div><i/><b>Tu decisión</b><small>Vos mantenés el control</small></div></div></section>
      <section id="como-funciona" className="hf-how hf-public-width" aria-labelledby="hf-how-title"><span className="hf-eyebrow">EMPEZAR, CON ACOMPAÑAMIENTO</span><h2 id="hf-how-title">De conocer HostFlow<br/>a ordenar tu operación.</h2><ol><li><span>01</span><h3>Encontrá tu modalidad</h3><p>Explorá el producto y prepará una consulta con lo que necesitás para tu gestión.</p></li><li><span>02</span><h3>Coordiná tu acceso</h3><p>El alcance y la incorporación se acuerdan de forma asistida. Sin altas automáticas de empresas.</p></li><li><span>03</span><h3>Organizá y operá</h3><p>Configurá tus alojamientos y gestioná reservas y tareas desde el panel, según tus permisos.</p></li></ol></section>
      <section id="planes" className="hf-plans-section" aria-labelledby="hf-plans-title"><div className="hf-public-width"><div className="hf-section-heading"><div><span className="hf-eyebrow">UNA PROPUESTA PARA TU GESTIÓN</span><h2 id="hf-plans-title">Elegí cómo querés<br/>conocer HostFlow.</h2></div><p>Modalidades orientativas, sin precios ni límites comerciales definidos. Conversemos sobre el alcance que necesitás.</p></div><div className="hf-plans">{catalogoComercial.planes.map(p=><article className={'hf-plan'+(p.destacado?' hf-plan-featured':'')} key={p.id}>{p.destacado&&<span className="hf-plan-label">PARA COORDINAR JUNTOS</span>}<Icono nombre={p.destacado?'personas':'casa'}/><h3>{p.nombre}</h3><p>{p.descripcion}</p><div className="hf-plan-price">{presentarModalidad(p).precio}<small>{presentarModalidad(p).disponibilidad}</small></div><ul>{p.caracteristicas.map(x=><li key={x}><span aria-hidden="true">✓</span>{x}</li>)}</ul><dl><div><dt>Alojamientos</dt><dd>{presentarModalidad(p).alojamientos}</dd></div><div><dt>Usuarios</dt><dd>{presentarModalidad(p).usuarios}</dd></div></dl><a className={'hf-button '+(p.destacado?'hf-button-mint':'hf-button-outline')} href="#solicitar" onClick={()=>seleccionar(p.id)}>{p.cta.texto}<Icono nombre="flecha"/></a></article>)}</div><ModalidadesComparadas elegir={seleccionar}/><p className="hf-plans-note">Estas modalidades no aplican restricciones a las cuentas existentes. Sin cobros, suscripciones ni activación automática desde esta página.</p></div></section>
      <section className="hf-security hf-public-width" aria-labelledby="hf-security-title"><span className="hf-feature-icon"><Icono nombre="escudo"/></span><div><span className="hf-eyebrow">CONTROL DESDE EL ACCESO</span><h2 id="hf-security-title">Cada persona, su lugar.</h2><p>Acceso autenticado, roles y permisos para trabajar con responsabilidades claras. La incorporación de usuarios es controlada, sin registro público de empresas.</p></div><a href="#preguntas">Conocer más <Icono nombre="flecha"/></a></section>
      <section id="preguntas" className="hf-faq hf-public-width" aria-labelledby="hf-faq-title"><div><span className="hf-eyebrow">ANTES DE EMPEZAR</span><h2 id="hf-faq-title">Buenas preguntas.<br/>Respuestas claras.</h2><p>Conocé el alcance actual del producto.</p></div><div>{preguntas.map(([pregunta,respuesta])=><details key={pregunta}><summary>{pregunta}</summary><p>{respuesta}</p></details>)}</div></section>
      <section id="solicitar" className="hf-contact hf-public-width" aria-labelledby="hf-contact-title"><div><span className="hf-eyebrow">EL PRÓXIMO PASO</span><h2 id="hf-contact-title">Tu gestión puede<br/>verse más clara.</h2><p>Prepará una consulta para compartir con quien te presentó HostFlow y coordinar una demostración.</p><p className="hf-contact-disclosure">El canal comercial directo todavía está por definir. Aquí no se envían datos ni se crean cuentas.</p></div><form onSubmit={preparar}><h3>Prepará tu consulta</h3><label htmlFor="hf-plan">Modalidad de interés</label><select id="hf-plan" value={plan} onChange={e=>seleccionar(e.target.value)}>{catalogoComercial.planes.map(p=><option value={p.id} key={p.id}>{p.nombre}</option>)}</select><label htmlFor="hf-alojamientos">Cantidad de alojamientos <span>(opcional)</span></label><input id="hf-alojamientos" inputMode="numeric" type="number" min="1" max="99999" step="1" value={cantidad} onChange={e=>{setCantidad(e.target.value);setMensaje('');setAviso('');setError('');}}/><button type="submit" className="hf-button hf-button-mint">Preparar mensaje <Icono nombre="flecha"/></button>{error&&<p role="alert">{error}</p>}{mensaje&&<div className="hf-contact-result"><label htmlFor="hf-solicitud">Mensaje preparado · sin enviar</label><textarea id="hf-solicitud" readOnly value={mensaje} rows={7}/><button type="button" onClick={copiar} className="hf-button hf-button-outline">Copiar consulta</button></div>}<p role="status" aria-live="polite">{aviso}</p></form></section>
    </main>
    <footer className="hf-public-footer hf-public-width"><div><a className="hf-public-brand" href="/">Host<span>Flow</span></a><p>Una visión más clara de tu operación.</p></div><nav aria-label="Navegación del pie"><a href="#funcionalidades">Producto</a><a href="#planes">Modalidades</a><a href="#solicitar">Preparar consulta</a><a href="/login">Iniciar sesión</a></nav><div className="hf-footer-bottom"><span>HostFlow · Gestión de alojamientos</span><span>Condiciones comerciales y políticas públicas: pendientes de publicación.</span></div></footer>
  </div>;
}
