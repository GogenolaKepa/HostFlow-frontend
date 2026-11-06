import {planes,precioPlan,descuentoAnualPuntosBase,herramientas} from '../services/catalogoComercial';
export default function ModalidadesComparadas({ciclo='mensual'}){
 const puntosBase=descuentoAnualPuntosBase(planes[0]);
 const descuento=Math.floor(puntosBase/100)+','+String(puntosBase%100).padStart(2,'0')+' %';
 return (        <details className="comparador">
          <summary>Comparar los tres planes <span aria-hidden="true">⌄</span></summary>
          <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Comparación de planes">
            <table>
              <caption>Planes por empresa · Usuarios con acceso al sistema, sin contar huéspedes</caption>
              <thead><tr><th scope="col">Para tu gestión</th>{planes.map(plan => <th scope="col" key={plan.id}>{plan.nombre}</th>)}</tr></thead>
              <tbody>
                <tr><th scope="row">Orientación</th>{planes.map(plan => <td key={plan.id}>{plan.enfoque}</td>)}</tr>
                <tr><th scope="row">Propiedades</th>{planes.map(plan => <td key={plan.id}>Hasta {plan.propiedades}</td>)}</tr>
                <tr><th scope="row">Usuarios del sistema</th>{planes.map(plan => <td key={plan.id}>{plan.usuarios === 1 ? '1 usuario' : 'Hasta ' + plan.usuarios}</td>)}</tr>
                {herramientas.map(texto => <tr key={texto}><th scope="row">{texto}</th>{planes.map(plan => <td key={plan.id}>Contemplado</td>)}</tr>)}
                <tr><th scope="row">Periodicidad elegida</th>{planes.map(plan => <td key={plan.id}>{ciclo === 'mensual' ? 'Mensual' : 'Anual'}</td>)}</tr>
                <tr><th scope="row">{ciclo === 'anual' ? 'Total anual por adelantado' : 'Importe mensual'}</th>{planes.map(plan => <td className="precio-comparacion" key={plan.id}>{precioPlan(plan, ciclo)}</td>)}</tr>
                <tr><th scope="row">Modalidad anual</th>{planes.map(plan => <td key={plan.id}>1 mes bonificado · {descuento}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </details>);
}
