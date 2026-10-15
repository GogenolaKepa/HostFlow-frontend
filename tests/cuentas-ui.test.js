import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

let vite, MiCuenta, Usuarios, Login, PermisosContext, Configuracion, ThemeProvider, BorradoresProvider;
before(async () => {
  // SSR local: sin backend ni peticiones API; los efectos React no se ejecutan.
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  vite = await createServer({ configFile: false, envDir: false, plugins: [react()],
    server: { middlewareMode: true, ws: false, watch: null } });
  MiCuenta = (await vite.ssrLoadModule("/src/pages/MiCuenta.jsx")).default;
  Usuarios = (await vite.ssrLoadModule("/src/pages/Usuarios.jsx")).default;
  Login = (await vite.ssrLoadModule("/src/pages/Login.jsx")).default;
  PermisosContext = (await vite.ssrLoadModule("/src/context/PermisosContext.js")).PermisosContext;
  Configuracion = (await vite.ssrLoadModule("/src/pages/Configuracion.jsx")).default;
  ThemeProvider = (await vite.ssrLoadModule("/src/context/ThemeContext.jsx")).ThemeProvider;
  BorradoresProvider = (await vite.ssrLoadModule("/src/context/BorradoresProvider.jsx")).BorradoresProvider;
});
after(async () => { await vite?.close(); delete globalThis.window; });
const usuario = { idUsuario: 1, nombre: "Prueba aislada", email: "prueba@example.invalid", rol: "Operador", gestionCuentasDisponible: true, debeCambiarPassword: true, versionRegistro: "0000000000000001" };

test("cambio obligatorio renderiza solo password y salida, sin editar nombre", () => {
  const html = renderToStaticMarkup(createElement(MiCuenta, { usuario, obligatorio: true, onLogout() {}, onSesionActualizada() {} }));
  assert.equal(html.includes('id="cuenta-actual"'), true);
  assert.equal(html.includes('id="cuenta-nueva"'), true);
  assert.equal(html.includes('id="cuenta-nombre"'), false);
  assert.equal(html.includes('type="password"'), true);
});
test("Mi cuenta mock muestra perfil sin formularios de escritura", () => {
  const html = renderToStaticMarkup(createElement(MiCuenta, { usuario: { ...usuario, gestionCuentasDisponible: false, debeCambiarPassword: false } }));
  assert.equal(html.includes(usuario.email), true);
  assert.equal(html.includes("<form"), false);
});
test("Usuarios sin permiso no renderiza administracion; Admin ve el alta", () => {
  const operador = renderToStaticMarkup(createElement(PermisosContext.Provider, { value: [] }, createElement(Usuarios, { usuarioActual: usuario })));
  assert.equal(operador.includes("Nuevo usuario"), false);
  const admin = renderToStaticMarkup(createElement(PermisosContext.Provider, { value: ["usuarios.ver", "usuarios.crear"] }, createElement(Usuarios, { usuarioActual: usuario })));
  assert.equal(admin.includes("Nuevo usuario"), true);
  assert.equal(admin.includes("Propietario"), false);
});
test("Login renderiza campos vacios, sin password o cuenta de demostracion", () => {
  const html = renderToStaticMarkup(createElement(Login, { onLogin() {} }));
  assert.equal(html.includes('id="login-password"'), true);
  assert.equal(html.includes('value=""'), true);
  assert.equal(html.includes("Usuario de prueba"), false);
});

test("perfil conserva el rol técnico y contraseñas ocultas con controles accesibles", () => {
  const html = renderToStaticMarkup(createElement(MiCuenta, { usuario: { ...usuario,
    nombre: "DIRECCIÓN DE PRUEBA", rol: "Administrador", debeCambiarPassword: false } }));
  assert.ok(html.includes("DIRECCIÓN DE PRUEBA"));
  assert.ok(html.includes("Administrador"));
  assert.equal((html.match(/type="password"/g) || []).length, 3);
  for (const label of ["Mostrar contraseña actual", "Mostrar nueva contraseña", "Mostrar repetir nueva contraseña"]) assert.ok(html.includes(`aria-label="${label}"`));
  assert.ok(html.includes('aria-describedby="cuenta-password-ayuda"'));
  assert.equal(html.includes('value="prueba"'), false);
});

test("Configuración personal no agrega administración al Operador ni formularios falsos", () => {
  const render = permisos => renderToStaticMarkup(createElement(ThemeProvider, null,
    createElement(BorradoresProvider, null, createElement(PermisosContext.Provider, { value: permisos }, createElement(Configuracion, { onNavegar() {}, gestionCuentasDisponible: true })))));
  const operador = render([]);
  assert.ok(operador.includes('name="apariencia"'));
  assert.ok(operador.includes('value="claro"'));
  assert.ok(operador.includes('value="oscuro"'));
  assert.ok(operador.includes('value="automatico"'));
  assert.equal(operador.includes('Datos de empresa'),false);
  assert.equal(operador.includes('<form'),false);
  const admin = render(['usuarios.ver','configuracion.ver','configuracion.modificar']);
  assert.ok(admin.includes('Datos de empresa')); assert.ok(admin.includes('Próximamente'));
});
