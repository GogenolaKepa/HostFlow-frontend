import '../styles/identidad-publica.css';

// El símbolo conserva el logo histórico del proyecto. La marca no agrega
// navegación, estado, peticiones ni dependencias a los flujos que la utilizan.
export default function MarcaHostFlow({className=''}) {
  return <span className={`hf-marca ${className}`}>
    <img className="hf-marca-isotipo" src="/brand/isotipo.svg" alt="" width="32" height="52" aria-hidden="true"/>
    <span className="hf-marca-nombre">Host<span>Flow</span></span>
  </span>;
}
