import {useMonedas} from '../../context/MonedasContext';
import {formatearImporte} from '../../services/importes';
export default function ImportePropiedad({propiedad}) {
 const {tarifas,estado,error}=useMonedas();
 const tarifa=propiedad.tarifaMonetaria||tarifas.find(t=>t.idPropiedad===propiedad.idPropiedad);
 if(estado?.activado&&error)return <span>Tarifa pendiente de consulta</span>;
 return <span>{formatearImporte(tarifa?.precio??propiedad.precioBase,tarifa?.moneda??propiedad.monedaBase)}</span>;
}
