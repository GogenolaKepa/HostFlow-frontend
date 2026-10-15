import Campo from './CampoConfiguracion';
import { SecurityIcon } from '../security/SecurityUI';

export default function FormularioOperativas({ datos, onChange, errores, disabled }) {
  return <>
    <div className="settings-fields">
      <Campo campo="horaIngreso" label="Check-in predeterminado" type="time" step="60" required value={datos.horaIngreso} onChange={onChange} error={errores.horaIngreso} disabled={disabled} />
      <Campo campo="horaEgreso" label="Check-out predeterminado" type="time" step="60" required value={datos.horaEgreso} onChange={onChange} error={errores.horaEgreso} disabled={disabled} />
    </div>
    <div className="settings-policy"><SecurityIcon name="info" /><div><h3>Valores iniciales para nuevas reservas manuales</h3><p>Se proponen al abrir el formulario. Podés ajustar cada horario antes de registrar la reserva. No se modifican reservas existentes, ediciones ni datos de Airbnb o Booking.</p></div></div>
    <dl className="settings-readonly"><div><dt>Zona horaria actual</dt><dd>{datos.zonaHoraria}</dd></div><div><dt>Preparación y limpieza</dt><dd>La tarea automática empieza al check-out y conserva como límite el próximo check-in, según las reglas actuales.</dd></div></dl>
    <p>La zona horaria y las reglas de limpieza no se editan en esta etapa. Las propiedades actuales no tienen horarios propios configurables.</p>
  </>;
}
