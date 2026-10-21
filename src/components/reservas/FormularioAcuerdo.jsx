export default function FormularioAcuerdo({valor,onChange,disabled=false,prefijo='acuerdo'}){
 const cambiar=(campo,v)=>onChange({...valor,[campo]:v,...(campo==='moneda'&&v!=='USD'?{pagoEquivalenteARS:false,fuenteReferencia:''}:{})});
 return <fieldset className="monedas-formulario-acuerdo" disabled={disabled}>
  <legend>Acuerdo monetario explícito</legend><p>Importe contractual total, independiente del precio por noche y del monto estimado. No registra cobros.</p>
  <div className="form-grid"><div><label htmlFor={`${prefijo}-moneda`}>Moneda acordada</label><select id={`${prefijo}-moneda`} value={valor.moneda} required onChange={e=>cambiar('moneda',e.target.value)}><option value="">Elegí ARS o USD</option><option>ARS</option><option>USD</option></select></div>
   <div><label htmlFor={`${prefijo}-importe`}>Importe acordado total</label><input id={`${prefijo}-importe`} inputMode="decimal" value={valor.importe} required onChange={e=>cambiar('importe',e.target.value)} /></div></div>
  <label><input type="checkbox" checked={valor.pagoEquivalenteARS} disabled={valor.moneda!=='USD'||disabled} onChange={e=>cambiar('pagoEquivalenteARS',e.target.checked)} />Pago en ARS equivalente al importe USD, a fijar el día del check-in</label>
  {valor.pagoEquivalenteARS&&<div><label htmlFor={`${prefijo}-fuente`}>Fuente acordada para el check-in</label><select id={`${prefijo}-fuente`} value={valor.fuenteReferencia} required onChange={e=>cambiar('fuenteReferencia',e.target.value)}><option value="">Elegí una fuente</option><option value="BCRA">BCRA — referencia estadística de divisas</option><option value="MANUAL">Manual — requiere advertencia y confirmación</option></select><p>Antes del check-in no se fija una cotización definitiva. Sin publicación de ese día, una última oficial requiere aceptación explícita.</p></div>}
 </fieldset>;
}
