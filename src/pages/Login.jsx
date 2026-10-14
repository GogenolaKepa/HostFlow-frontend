import { useState } from "react";
import api from "../services/api";
import { guardarSesion } from "../services/session";

function Login({ onLogin, aviso }) {
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
      });

      guardarSesion(response.data.token, response.data.usuario);
      onLogin();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "Error al iniciar sesión"
      );
    } finally { setOcupado(false); }
  };

  return (
    <div className="login-container">
      <div className="login-info">
        <h1>HostFlow</h1>
        <p>
          Gestión centralizada de alquileres temporarios
        </p>
      </div>

      <form
        className="login-card"
        onSubmit={iniciarSesion}
      >
        <h2>Iniciar sesión</h2>
        {aviso && <p role="status">{aviso}</p>}

        <label htmlFor="login-email">
          Correo electrónico
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <label htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <button type="submit" disabled={ocupado}>
          {ocupado ? "Ingresando…" : "Ingresar"}
        </button>

      </form>
    </div>
  );
}

export default Login;
