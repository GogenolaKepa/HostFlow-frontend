import { useTheme } from '../../context/theme';
import { SecurityIcon } from '../security/SecurityUI';

const choices = [
  { id: 'claro', title: 'Claro', description: 'Superficies claras y azules de HostFlow.', icon: 'sun' },
  { id: 'oscuro', title: 'Oscuro', description: 'Una paleta oscura para tu espacio de trabajo.', icon: 'moon' },
  { id: 'automatico', title: 'Automático', description: 'Se adapta a la apariencia de tu sistema.', icon: 'monitor' },
];
export default function Apariencia() {
  const appearance = useTheme();
  return <>
    <div className="settings-card">
      <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="appearance" /></span><div><h2>Apariencia</h2><p>Elegí el tema que te resulte más cómodo. Se aplica al instante.</p></div></div>
      <fieldset className="theme-options"><legend className="security-sr-only">Elegir apariencia</legend>
        {choices.map(choice => <label key={choice.id} className={`theme-option ${appearance.preference === choice.id ? 'is-selected' : ''}`}>
          <input type="radio" name="apariencia" value={choice.id} checked={appearance.preference === choice.id} onChange={() => appearance.setPreference(choice.id)} />
          <span className={`theme-preview theme-preview--${choice.id}`} aria-hidden="true"><span className="theme-preview-sidebar"><i /><i /><i /></span><span className="theme-preview-main"><i /><span><i /><i /></span><i /></span>{choice.id === 'automatico' && <span className="theme-preview-system"><SecurityIcon name="monitor" /></span>}</span>
          <span className="theme-option-title"><SecurityIcon name={choice.icon} />{choice.title}<span className="theme-radio-mark" aria-hidden="true" /></span><span className="theme-option-description">{choice.description}</span>
        </label>)}
      </fieldset>
      <div className="theme-status" role="status"><SecurityIcon name="check" /><div><strong>Tema {appearance.theme === 'dark' ? 'oscuro' : 'claro'} activo</strong><p>{!appearance.storageAvailable ? 'Se aplicó el tema, pero este navegador no permite guardar la preferencia. Se perderá al recargar.' : appearance.persisted ? 'Preferencia guardada en este navegador. Se conserva al recargar y cerrar sesión.' : 'Claro es el tema predeterminado. Tu elección se guardará al seleccionar una opción.'}</p></div></div>
    </div>
    <div className="settings-note"><SecurityIcon name="monitor" /><div><h3>Tu sistema, tu preferencia</h3><p>En Automático, HostFlow sigue el tema del sistema y responde a sus cambios. Actualmente el sistema usa apariencia {appearance.system === 'dark' ? 'oscura' : 'clara'}.</p><p>Esta elección no cambia la apariencia de otros dispositivos ni los permisos de tu cuenta.</p></div></div>
  </>;
}
