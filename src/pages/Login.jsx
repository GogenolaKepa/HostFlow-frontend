import { useFondoLogin } from '../hooks/useFondoLogin';
import '../styles/login-premium.css';
import { useState } from "react";
import api from "../services/api";
import { guardarSesion } from "../services/session";
import {mensajeErrorAcceso} from '../services/disponibilidadApi';
import {useComercial} from '../context/ComercialContext';
import {EnlaceRecuperacionPreparado} from '../components/autenticacion/EntradaComercialPreparada';

function Login({ onLogin, aviso, abrirRecuperacion }) {
  const comercial=useComercial();
  const fondo = useFondoLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const iniciarSesion = async (e) => {
    e.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      }, {timeout:15000});

      guardarSesion(response.data.token, response.data.usuario);
      onLogin();
    } catch (error) {
      setError(mensajeErrorAcceso(error));
    } finally { setOcupado(false); }
  };

  return (
    <main className="login-container login-premium" data-fondo={fondo.estado}>
      <div className="login-hero" aria-hidden="true" style={fondo.url ? {backgroundImage: `url("${fondo.url}")`} : undefined}/>
      <a className="login-volver-publico" href="/">← Volver a HostFlow</a>
      <div className="login-contenido">
        <section className="login-info" aria-labelledby="marca-login"><div className="identidad-login">
          <img src="/brand/isotipo.svg" width="52" height="85" alt=""/>
          <h1 id="marca-login"><span className="marca"><span className="nombre-login">Host<span>Flow</span></span></span></h1>
          <p>Gestión centralizada de alquileres temporarios</p>
        </div></section>
        <form className="login-card" onSubmit={iniciarSesion} aria-busy={ocupado}>
          <span className="login-ceja">TU ESPACIO DE TRABAJO</span><h2>Iniciar sesión</h2><p className="login-intro">Accedé con tu cuenta autorizada.</p>
          {aviso&&<p role="status">{aviso}</p>}
          <label htmlFor="login-email">Correo electrónico</label><input id="login-email" type="email" value={email} autoComplete="email" placeholder="tu@empresa.com" onChange={e=>setEmail(e.target.value)}/>
          <label htmlFor="login-password">Contraseña</label><input id="login-password" type="password" value={password} autoComplete="current-password" placeholder="Ingresá tu contraseña" onChange={e=>setPassword(e.target.value)}/>
          {error&&<p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={ocupado}>{ocupado?'Ingresando…':'Ingresar'}<span aria-hidden="true">→</span></button>
          <div className="login-ayuda"><EnlaceRecuperacionPreparado capacidades={comercial?.capacidades} abrir={abrirRecuperacion}/></div>
          <div className="login-contacto"><span>¿Todavía no tenés acceso?</span><a href="/#contacto">Solicitar información →</a></div>
        </form>
      </div>
    </main>
  );
}
export default Login;
