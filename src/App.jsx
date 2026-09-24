import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  const usuarioGuardado =
    localStorage.getItem("usuario");

  const [usuario, setUsuario] =
    useState(
      usuarioGuardado
        ? JSON.parse(usuarioGuardado)
        : null
    );

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  };

  return (
    <>
      {usuario ? (
        <Dashboard
          usuario={usuario}
          onLogout={cerrarSesion}
        />
      ) : (
        <Login
          onLogin={setUsuario}
        />
      )}
    </>
  );
}

export default App;
