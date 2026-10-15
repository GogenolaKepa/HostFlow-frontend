import Campo from './CampoConfiguracion';
import { LIMITES_EMPRESA } from '../../services/configuracion';

const campos = [ ['nombreComercial','Nombre comercial','text','organization'], ['razonSocial','Razón social','text','off'],
  ['correoContacto','Correo de contacto','email','email'], ['telefono','Teléfono','tel','tel'],
  ['pais','País','text','country-name'], ['provincia','Provincia o región','text','address-level1'],
  ['ciudad','Ciudad','text','address-level2'], ['direccion','Dirección','text','street-address'] ];
export default function FormularioEmpresa({ datos, onChange, errores, disabled }) {
  return <div className="settings-fields">
    {campos.map(([campo,label,type,autoComplete]) => <Campo key={campo} campo={campo} label={label} type={type} autoComplete={autoComplete}
      value={datos[campo]} required={campo==='nombreComercial'} maxLength={LIMITES_EMPRESA[campo]} onChange={onChange} error={errores[campo]} disabled={disabled} />)}
    <Campo campo="informacionAdicional" label="Información adicional" multiline value={datos.informacionAdicional} maxLength={LIMITES_EMPRESA.informacionAdicional}
      onChange={onChange} error={errores.informacionAdicional} disabled={disabled} />
  </div>;
}
