import './ValidandoSesion.css';

export default function ValidandoSesion() {
  return (
    <div className="login-container sesion-preparando" role="status" aria-live="polite" aria-busy="true">
      <div className="sesion-preparando-contenido">
        <span className="sesion-preparando-marca">HostFlow</span>
        <div className="sesion-preparando-actividad" aria-hidden="true"><span /></div>
        <p>Verificando tu sesión</p>
      </div>
    </div>
  );
}
