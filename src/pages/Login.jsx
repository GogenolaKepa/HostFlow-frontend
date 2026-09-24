import { useState } from "react";
import api from "../services/api";

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@hostflow.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem(
        "usuario",
        JSON.stringify(response.data.usuario)
      );

      onLogin(response.data.usuario);
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "Error al iniciar sesión"
      );
    }
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

        <button type="submit">
          Ingresar
        </button>

        <small>
          Usuario de prueba: admin@hostflow.com / 123456
        </small>
      </form>
    </div>
  );
}

export default Login;
