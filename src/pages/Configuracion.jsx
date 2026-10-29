import CargaPagina from "../components/CargaPagina";
import { lazy, Suspense, useState } from 'react';
import { usePermisos } from '../context/PermisosContext';
import { SecurityIcon } from '../components/security/SecurityUI';
import { useProtectorBorradores } from '../context/BorradoresContext';
import Apariencia from '../components/configuracion/Apariencia';
import PanelConfiguracion from '../components/configuracion/PanelConfiguracion';
const PreferenciasNotificaciones = lazy(() => import('../components/configuracion/PreferenciasNotificaciones'));
import PreferenciasGenerales from '../components/configuracion/PreferenciasGenerales';
const MonedasCotizaciones = lazy(() => import('../components/configuracion/MonedasCotizaciones'));

const sections = [
  { id: 'apariencia', title: 'Apariencia', icon: 'appearance', disponible: true },
  { id: 'generales', title: 'Preferencias generales', icon: 'settings', disponible: true },
  { id: 'operativas', title: 'Preferencias operativas', icon: 'calendar', disponible: true },
  { id: 'empresa', title: 'Datos de empresa', icon: 'building', disponible: true },
  { id: 'monedas', title: 'Monedas y cotizaciones', icon: 'settings', disponible: true },
  { id: 'notificaciones', title: 'Notificaciones', icon: 'bell', disponible: true },
  { id: 'integraciones', title: 'Integraciones', icon: 'link' },
  { id: 'seguridad', title: 'Seguridad y acceso', icon: 'shield', disponible: true },
];

export default function Configuracion({ onNavegar, gestionCuentasDisponible = false, apartadoInicial = 'apariencia' }) {
  const permite = usePermisos();
  const general = permite('usuarios.ver');
  const empresarial = permite('configuracion.ver');
  const [section,setSection] = useState(apartadoInicial==='monedas'&&empresarial?'monedas':'apariencia');
  const { protector, ocupado: busy } = useProtectorBorradores();
  const current = sections.find(item=>item.id===section);
  const visibles = sections.filter(item=>['apariencia','generales'].includes(item.id) || (item.id==='notificaciones'?permite('notificaciones.preferencias'):['empresa','operativas','monedas'].includes(item.id)?empresarial:general));
  const navegar = id => {
    if(id===section||busy)return;
    protector.solicitar(() => setSection(id));
  };
  const contenido = () => {
    if(section==='apariencia')return <Apariencia />;
    if(section==='generales')return <PreferenciasGenerales />;
    if(section==='monedas'&&empresarial)return <Suspense fallback={<p role="status">Cargando monedas…</p>}><MonedasCotizaciones /></Suspense>;
    if(section==='notificaciones'&&permite('notificaciones.preferencias'))return <Suspense fallback={<CargaPagina variante="preferencias" />}><PreferenciasNotificaciones onNavegar={onNavegar} /></Suspense>;
    if(['empresa','operativas'].includes(section) && empresarial) return <PanelConfiguracion key={section} tipo={section} />;
    if(section==='seguridad' && general) return <div className="settings-card">
      <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="shield" /></span><div><h2>Seguridad y acceso</h2><p>Las cuentas y los roles se administran desde Usuarios.</p></div></div>
      <p>Tu perfil y tu contraseña están disponibles en Mi cuenta. Estos accesos conservan los permisos y las validaciones existentes.</p>
      <div className="settings-links">{gestionCuentasDisponible?<button type="button" onClick={()=>onNavegar('usuarios')}>Gestionar usuarios<SecurityIcon name="right" /></button>:<p>La gestión de usuarios no está disponible en la configuración actual.</p>}<button type="button" onClick={()=>onNavegar('mi-cuenta')}>Ir a Mi cuenta<SecurityIcon name="right" /></button></div>
    </div>;
    return <div className="settings-card settings-unavailable"><span className="settings-icon"><SecurityIcon name={current.icon} /></span><span className="settings-coming">Próximamente</span><h2>{current.title}</h2><p>Esta configuración todavía no está disponible. Se incorporará en una próxima etapa.</p><p>No hay cambios para guardar en esta sección.</p></div>;
  };
  return <section className="settings-page">
    <header className="settings-heading"><span className="settings-eyebrow"><SecurityIcon name="settings" />Tu espacio en HostFlow</span><h1>Configuración</h1><p>{general||empresarial?'Personalizá tu experiencia y administrá la información de tu equipo.':'Elegí cómo querés ver HostFlow en este navegador.'}</p></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Secciones de configuración">
        {visibles.map(item=><button key={item.id} type="button" disabled={busy} className={section===item.id?'is-active':''} aria-current={section===item.id?'page':undefined} onClick={()=>navegar(item.id)}><SecurityIcon name={item.icon} /><span>{item.title}</span>{!item.disponible&&<small>Próximamente</small>}</button>)}
        <p><SecurityIcon name="monitor" />La apariencia se guarda en este navegador. Los datos de empresa y los horarios corresponden a la empresa vinculada a HostFlow.</p>
      </nav>
      <div className="settings-content">{contenido()}</div>
    </div>
  </section>;
}
