import {useId} from 'react';
import {distribucionCantidades,puntosTendencia} from '../../services/graficosReportes';
const numero=v=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(v);
const mes=v=>new Intl.DateTimeFormat('es-AR',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z'));
export function GraficoTendencia({datos,campo,titulo,unidad='',maximo}) {
 const id=useId(),{puntos,techo}=puntosTendencia(datos,campo,maximo);
 if(!puntos.length)return <div className="chart-empty">No hay datos mensuales para este período.<span>Probá ampliar el rango de fechas.</span></div>;
 const linea=puntos.map(p=>`${p.x},${p.y}`).join(' ');
 return <div className="chart-trend">
  <svg viewBox="0 0 640 248" role="img" aria-labelledby={id+'-title'}>
   <title id={id+'-title'}>{titulo}. {puntos.map(p=>`${mes(p.inicioMes)}: ${numero(p[campo])}${unidad}`).join('; ')}</title>
   <defs><linearGradient id={id+'-fill'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".25"/><stop offset="100%" stopColor="currentColor" stopOpacity=".02"/></linearGradient></defs>
   {[0,.5,1].filter(t=>unidad||Number.isInteger(techo*t)).map(t=><g key={t}><line className="chart-gridline" x1="48" x2="592" y1={202-168*t} y2={202-168*t}/><text className="chart-axis" x="35" y={207-168*t} textAnchor="end">{numero(techo*t)}{unidad}</text></g>)}
   {puntos.length>1&&<><polygon points={`${puntos[0].x},202 ${linea} ${puntos.at(-1).x},202`} fill={`url(#${id}-fill)`}/><polyline points={linea} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></>}
   {puntos.map((p,i)=><g key={p.mes}><circle cx={p.x} cy={p.y} r="4.5" fill="currentColor"><title>{mes(p.inicioMes)}: {numero(p[campo])}{unidad}</title></circle>{(i===0||i===puntos.length-1||puntos.length<=6)&&<text className={'chart-axis '+(i>0&&i<puntos.length-1?'chart-label-middle':'')} x={p.x} y="231" textAnchor="middle">{mes(p.inicioMes)}</text>}</g>)}
  </svg>
  {puntos.length===1&&<p className="chart-note">Un mes disponible: {numero(puntos[0][campo])}{unidad}. La tendencia se verá al incluir más meses.</p>}
  <details className="chart-data"><summary>Ver datos de {titulo.toLowerCase()}</summary><div className="chart-data-scroll"><table><thead><tr><th>Mes</th><th>{titulo}</th>{campo==='ocupacionMensual'&&<><th>Ocupadas</th><th>Disponibles</th></>}</tr></thead><tbody>{puntos.map(p=><tr key={p.mes}><th scope="row">{mes(p.inicioMes)}</th><td>{numero(p[campo])}{unidad}</td>{campo==='ocupacionMensual'&&<><td>{p.nochesOcupadas}</td><td>{p.nochesDisponibles}</td></>}</tr>)}</tbody></table></div></details>
 </div>;
}
export function GraficoDistribucion({filas,titulo,etiquetaTotal='reservas'}) {
 const id=useId(),{total,filas:segmentos}=distribucionCantidades(filas);
 if(total==='0')return <div className="chart-empty">Sin {etiquetaTotal} para mostrar.<span>No hay distribución para los filtros actuales.</span></div>;
 let inicio=0;
 return <div className="chart-distribution"><div className="chart-ring-wrap"><svg viewBox="0 0 200 200" role="img" aria-labelledby={id}><title id={id}>{titulo}: {segmentos.map(f=>`${f.etiqueta}: ${f.valor}`).join('; ')}</title><circle cx="100" cy="100" r="74" className="chart-ring-track"/>{segmentos.map((f,i)=>{const offset=inicio;inicio+=f.fraccion;return <circle key={f.etiqueta} className={`chart-series chart-series-${i%6}`} cx="100" cy="100" r="74" fill="none" strokeWidth="22" pathLength="1" strokeDasharray={`${f.fraccion} ${1-f.fraccion}`} strokeDashoffset={-offset} transform="rotate(-90 100 100)"><title>{f.etiqueta}: {f.valor}</title></circle>;})}</svg><div className="chart-ring-label"><strong>{total}</strong><span>{etiquetaTotal}</span></div></div>
  <div className="reportes-breakdown-list chart-legend">{segmentos.map((f,i)=><div className="reportes-breakdown-row" key={f.etiqueta}><span aria-hidden="true" className={`chart-dot chart-series-${i%6}`}/><div><strong>{f.etiqueta}</strong><span>{f.valor} {etiquetaTotal}</span></div><span className="chart-legend-percent">{numero(f.fraccion*100)}%</span></div>)}</div>
 </div>;
}
export function GraficoPropiedades({datos}) {
 const maximo=Math.max(1,...datos.map(p=>p.reservas));
 if(!datos.length||!datos.some(p=>p.reservas>0))return <div className="chart-empty">Sin reservas por propiedad.<span>Los alojamientos aparecerán al contar con reservas en el período.</span></div>;
 return <div className="chart-properties" role="img" aria-label="Comparación de reservas por propiedad">{datos.map(p=><div className="chart-property-row" key={p.idPropiedad}><div><strong>{p.propiedad}</strong><span>{p.reservas} reservas · {p.nochesReservadas} noches</span></div><div className="chart-category-track"><span style={{width:`${p.reservas/maximo*100}%`}}/></div></div>)}</div>;
}
