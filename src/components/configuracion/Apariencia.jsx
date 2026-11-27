import { useTheme } from '../../context/theme';
import { SecurityIcon } from '../security/SecurityUI';

const choices = [
  { id: 'claro', theme: 'light', title: 'Claro', description: 'Grises fríos y tarjetas claras.', icon: 'sun' },
  { id: 'oscuro', theme: 'dark', title: 'Oscuro', description: 'Azul marino y acentos de HostFlow.', icon: 'moon' },
  { id: 'crema', theme: 'cream', title: 'Crema', description: 'Superficies cálidas y azul sobrio.', icon: 'cream' },
  { id: 'grafito', theme: 'graphite', title: 'Grafito', description: 'Grises carbón y acentos azules.', icon: 'graphite' },
  { id: 'automatico', title: 'Según el sistema', description: 'Sigue la configuración de tu dispositivo.', icon: 'monitor' },
];

export default function Apariencia() {
  const appearance = useTheme();
  const active = choices.find(choice => choice.theme === appearance.theme);
  const status = appearance.preference === 'automatico' ? 'Apariencia según el sistema activa' : `Tema ${active.title} activo`;
  let storageMessage = 'La elección se guarda para tu cuenta en este navegador.';
  if (!appearance.storageAvailable) storageMessage = 'El navegador no permite guardar el tema. La elección se perderá al recargar.';
  else if (appearance.persisted) storageMessage = 'Preferencia guardada para tu cuenta en este navegador.';

  return (
    <div className="settings-card settings-appearance">
      <div className="settings-card-heading"><span className="settings-icon"><SecurityIcon name="appearance" /></span><div><h2>Apariencia</h2><p>Elegí el tema que te resulte más cómodo. Se aplica al instante.</p></div></div>
      <fieldset className="theme-options"><legend className="security-sr-only">Elegir apariencia</legend>
        {choices.map(choice => <label key={choice.id} className={`theme-option ${appearance.preference === choice.id ? 'is-selected' : ''}`}>
          <input type="radio" name="apariencia" value={choice.id} checked={appearance.preference === choice.id}
            onChange={() => appearance.setPreference(choice.id)}
            onClick={() => { if (appearance.preference === choice.id && !appearance.persisted) appearance.setPreference(choice.id); }} />
          <span className="theme-preview" data-hf-preview={choice.theme ?? appearance.system} aria-hidden="true"><span className="theme-preview-sidebar"><i /><i /><i /></span><span className="theme-preview-main"><i /><span><i /><i /></span><i /></span></span>
          <span className="theme-option-title"><SecurityIcon name={choice.icon} />{choice.title}<span className="theme-radio-mark" aria-hidden="true" /></span><span className="theme-option-description">{choice.description}</span>
        </label>)}
      </fieldset>
      <div className="theme-status" role="status"><SecurityIcon name="check" /><div><strong>{status}</strong><p>{storageMessage}</p></div></div>
    </div>
  );
}
