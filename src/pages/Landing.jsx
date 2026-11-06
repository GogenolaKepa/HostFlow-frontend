import {useEffect,useRef,useState} from 'react';
import MarcaHostFlow from '../components/MarcaHostFlow';
import Planes from '../components/PlanesComerciales';
import Contacto from '../components/ContactoComercial';
import hero from '../assets/login/hero.webp';
import heroMobile from '../assets/login/hero-mobile.webp';
import '../styles/landing.css';
function Marca(){return <MarcaHostFlow className="marca"/>;}
function Foto({className=''}){return <picture className={className}><source media="(max-width:640px)" srcSet={heroMobile}/><img src={hero} width="1672" height="940" alt="" fetchPriority="high"/></picture>;}
const trazos = {
  casa: 'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',
  calendario: 'M5 5h14v16H5zM8 3v4m8-4v4M5 10h14m-10 4h2m2 0h2',
  personas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8m2 3a4 4 0 0 1 3 4v2',
  grafico: 'M4 3v18h17M8 16v-4m5 4V8m5 8V5',
  limpieza: 'm6 20 7-12 4 2-7 12M13 8l3-5M5 20h7M4 11l1-2m15 6 1-2',
  escudo: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
  destello: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
};

function Icono({ nombre }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[nombre]} /></svg>;
}


function VistaProducto() {
  return <div className="vista-producto" aria-label="Herramientas de HostFlow">
    <div className="vista-barra"><span className="mini-marca">H<span>F</span></span><span>Tu espacio de trabajo</span><span className="badge">EL PRODUCTO</span></div>
    <div className="vista-cuerpo"><div className="vista-menu" aria-hidden="true">{['casa','calendario','grafico','personas'].map(nombre=><Icono key={nombre} nombre={nombre}/>)}</div>
    <div className="vista-contenido"><span className="ceja">UNA VISIÓN MÁS CLARA</span><h3>Todo el contexto, en un panel.</h3>
      <div className="vista-metricas">{[['Alojamientos','Información organizada'],['Reservas','Fechas e historial'],['Equipo','Roles y permisos']].map(([titulo,texto])=><div key={titulo}><strong>{titulo}</strong><span>{texto}</span></div>)}</div>
      <div className="vista-movimientos">{[['calendario','Reservas y calendario','El contexto de cada estadía'],['limpieza','Limpiezas y seguimiento','De una salida a la próxima llegada']].map(([icono,titulo,texto])=><div key={titulo}><Icono nombre={icono}/><span><b>{titulo}</b><small>{texto}</small></span></div>)}</div>
      <p className="vista-aviso"><Icono nombre="escudo"/>La información y las acciones disponibles dependen de los permisos de cada cuenta.</p>
    </div></div></div>;
}

const beneficios = [
  ['casa', 'Cada alojamiento, en contexto', 'Propiedades y huéspedes con su información organizada para consultar el contexto de cada estadía.', ['Propiedades', 'Huéspedes']],
  ['calendario', 'Reservas bajo control', 'Consultá fechas, disponibilidad y el historial de cada reserva desde un mismo espacio.', ['Reservas', 'Calendario']],
  ['limpieza', 'El próximo ingreso empieza antes', 'Seguí las tareas entre una salida y la próxima llegada, con estados y prioridades visibles.', ['Limpiezas']],
  ['grafico', 'Una operación que se entiende', 'Dashboard y reportes para leer ocupación, reservas e importes declarados, con ARS y USD separados.', ['Dashboard', 'Reportes']],
  ['destello', 'Las señales, a la vista', 'Revisá alertas y notificaciones para saber qué necesita atención. Las sincronizaciones son acciones explícitas.', ['Alertas', 'Notificaciones']],
  ['personas', 'Un equipo, roles claros', 'Organizá el acceso con perfiles Administrador y Operador, respetando los permisos de cada persona.', ['Usuarios y permisos']],
];

const preguntas = [
  ['¿Qué es HostFlow?', 'Es una aplicación para centralizar la gestión de alojamientos temporarios, huéspedes, reservas y seguimiento operativo.'],
  ['¿Para quién está pensado?', 'Para personas y equipos que necesitan organizar alojamientos y coordinar el trabajo cotidiano desde un mismo panel.'],
  ['¿Puedo contratar un plan desde esta página?', 'Inicial, Profesional y Gestión son planes por empresa. Podés consultar el alcance y coordinar tu incorporación. Esta página no cobra, activa suscripciones ni registra empresas.'],
  ['¿Se conecta automáticamente con Booking y Airbnb?', 'Los recorridos multicanal actuales utilizan simuladores. No se ofrece sincronización productiva automática con esos proveedores.'],
  ['¿Cómo se incorporan usuarios?', 'HostFlow distingue Administrador y Operador. Las invitaciones y la recuperación por correo requieren activación supervisada. No hay registro público de empresas desde esta página.'],
  ['¿FlowIA utiliza IA externa?', 'El análisis operativo habitual funciona sin IA externa. Potenciarlo requiere consentimiento informado. La privacidad identifica al proveedor Google Gemini y el alcance del envío.'],
];

export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [ciclo, setCiclo] = useState('mensual');
  const [plan, setPlan] = useState('inicial');
  const botonMenu = useRef(null);
  useEffect(() => {
    document.title = 'HostFlow | Tu operación. En un solo lugar.';
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }, []);
  function cerrarMenu(evento) {
    if (evento.key === 'Escape') {
      setMenu(false);
      botonMenu.current?.focus();
    }
  }
  return (
    <div className="hf-landing hf-hibrido">
      <a className="saltar" href="#principal">Saltar al contenido</a>
      <header className="cabecera" onKeyDown={cerrarMenu}>
        <div className="ancho nav-fila">
          <a href="/" aria-label="HostFlow, inicio"><Marca /></a>
          <button ref={botonMenu} className="menu-movil" type="button" aria-expanded={menu} aria-controls="navegacion" onClick={() => setMenu(!menu)}>
            <span>{menu ? 'Cerrar' : 'Menú'}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={menu ? 'M6 6l12 12M6 18 18 6' : 'M3 6h18M3 12h18M3 18h18'} /></svg>
          </button>
          <nav id="navegacion" className={menu ? 'abierto' : ''} aria-label="Principal" onClick={() => setMenu(false)}>
            <a href="#funciones">El producto</a><a href="#como-funciona">Cómo funciona</a><a href="#planes">Planes</a><a href="#preguntas">Preguntas</a><a href="/login" className="nav-acceso">Iniciar sesión ↗</a>
          </nav>
        </div>
      </header>
      <main id="principal">
        <section className="hero" aria-labelledby="hf-hero-title">
          <Foto className="hero-foto" /><div className="hero-sombra" />
          <div className="hero-interior ancho">
            <div className="hero-texto">
              <span className="ceja">HOSTFLOW · GESTIÓN DE ALOJAMIENTOS</span>
              <h1 id="hf-hero-title" aria-label="Tu operación. En un solo lugar.">Tu operación.<br /><em>En un solo lugar.</em></h1>
              <p>Más claridad para gestionar tus alojamientos, tus reservas y tu equipo. Todo el contexto de tu operación, en un mismo espacio.</p>
              <div className="acciones"><a className="boton primario" href="/demo">Explorar la demo<span aria-hidden="true">→</span></a><a className="boton cristal" href="#planes">Conocer los planes</a></div>
              <span className="micro"><Icono nombre="escudo" />Acceso controlado · Roles definidos · Gestión centralizada</span>
            </div>
            <div className="hero-leyenda"><span>DEL ALOJAMIENTO A LA OPERACIÓN</span><p>Un espacio para ver<br />el panorama completo.</p></div>
          </div>
        </section>
        <section className="producto-intro seccion ancho" aria-labelledby="producto-titulo">
          <div className="titulo-seccion"><div><span className="ceja">PENSADO PARA EL DÍA A DÍA</span><h2 id="producto-titulo">Todo conectado.<br /><span>Todo más claro.</span></h2></div><p>Una reserva también es una llegada, una tarea y una decisión. HostFlow reúne ese contexto para acompañar cada estadía.</p></div>
          <VistaProducto />
        </section>
        <section id="funciones" className="seccion ancho" aria-labelledby="funciones-titulo">
          <div className="titulo-seccion"><div><span className="ceja">UN PANEL, TODA TU OPERACIÓN</span><h2 id="funciones-titulo">El orden que tu<br />gestión necesita.</h2></div><p>Herramientas concretas para organizar la información, coordinar tareas y seguir el trabajo cotidiano.</p></div>
          <div className="beneficios">{beneficios.map(([icono, titulo, texto, etiquetas]) => <article key={titulo}><span className="beneficio-icono"><Icono nombre={icono} /></span><h3>{titulo}</h3><p>{texto}</p><div className="etiquetas">{etiquetas.map(etiqueta => <span key={etiqueta}>{etiqueta}</span>)}</div></article>)}</div>
        </section>
        <section className="flowia ancho" aria-labelledby="flowia-titulo">
          <div><span className="ceja">CONOCÉ FLOWIA</span><h2 id="flowia-titulo">Más contexto.<br />Mejores decisiones.</h2><p>Análisis y recomendaciones para leer tu operación y reconocer lo que necesita atención. Vos mantenés el control de cada decisión.</p><details><summary>Vos decidís cuándo potenciar el análisis</summary><p>El análisis habitual no requiere IA externa. Su uso opcional exige consentimiento informado; privacidad identifica a Google Gemini. No se cambian reservas ni tarifas automáticamente.</p></details></div>
          <div className="flowia-vista"><span className="ceja">ANÁLISIS OPERATIVO · VISTA ILUSTRATIVA</span>{[['Organización', 'Información en contexto'], ['Seguimiento', 'Señales para revisar'], ['Tu decisión', 'Vos mantenés el control']].map(([titulo, texto]) => <div key={titulo}><Icono nombre="destello" /><span><strong>{titulo}</strong><small>{texto}</small></span></div>)}</div>
        </section>
        <section id="como-funciona" className="seccion ancho pasos" aria-labelledby="pasos-titulo">
          <span className="ceja">EMPEZAR, CON ACOMPAÑAMIENTO</span><h2 id="pasos-titulo">De conocer HostFlow<br />a ordenar tu operación.</h2>
          <ol>{[['Encontrá tu plan', 'Elegí una propuesta y prepará una consulta con lo que necesitás para tu gestión.'], ['Coordiná tu acceso', 'El alcance y la incorporación se acuerdan de forma asistida, antes de habilitar una cuenta.'], ['Organizá y operá', 'Gestioná alojamientos, reservas y tareas desde el panel, según tus permisos.']].map(([titulo, texto], indice) => <li key={titulo}><span>0{indice + 1}</span><div><h3>{titulo}</h3><p>{texto}</p></div></li>)}</ol>
        </section>
        <Planes ciclo={ciclo} setCiclo={setCiclo} elegir={setPlan} />
        <section className="accesos ancho" aria-labelledby="accesos-titulo"><span className="beneficio-icono"><Icono nombre="escudo" /></span><div><span className="ceja">CONTROL DESDE EL ACCESO</span><h2 id="accesos-titulo">Cada persona, su lugar.</h2><p>Roles y permisos para trabajar con responsabilidades claras. El acceso es controlado y no hay alta pública automática de empresas.</p></div><a href="#preguntas">Conocer más ↗</a></section>
        <section id="preguntas" className="faq ancho seccion" aria-labelledby="preguntas-titulo"><div><span className="ceja">ANTES DE EMPEZAR</span><h2 id="preguntas-titulo">Buenas preguntas.<br />Respuestas claras.</h2><p>Conocé el alcance actual de HostFlow.</p></div><div>{preguntas.map(([titulo, texto]) => <details key={titulo}><summary>{titulo}</summary><p>{texto}</p></details>)}</div></section>
        <Contacto plan={plan} setPlan={setPlan} ciclo={ciclo} setCiclo={setCiclo} />
        <section className="privacidad ancho" id="privacidad"><details><summary>Privacidad de la consulta</summary><p>El mensaje se prepara únicamente en tu navegador. Esta página no registra ni envía la consulta, no crea cuentas y no suscribe a marketing. Si elegís enviarlo, se abrirá tu aplicación de correo. contacto@hostflow.com.ar es el canal comercial; seguridad@hostflow.com.ar se conserva para comunicaciones de seguridad.</p></details></section>
      </main>
      <footer className="pie ancho"><div><Marca /><p>Una visión más clara de tu operación.</p></div><nav aria-label="Pie de página"><a href="#funciones">Producto</a><a href="#planes">Planes</a><a href="#contacto">Contacto</a><a href="/login">Iniciar sesión</a></nav><div className="pie-base"><span>HostFlow · Gestión de alojamientos</span><a href="#privacidad">Privacidad de la consulta</a></div></footer>
    </div>
  );
}
