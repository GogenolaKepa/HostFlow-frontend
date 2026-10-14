import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import axios from "axios";
import {
  SESION_CERRADA,
  CAMBIO_PASSWORD_REQUERIDO,
  aplicarRespuestaSesion,
  cerrarSesionEnServidor,
  configurarAutenticacion,
  consultarSesion,
  guardarSesion,
  limpiarSesion,
  obtenerToken,
} from "../src/services/session.js";

let cierres;
beforeEach(() => {
  const valores = new Map();
  globalThis.localStorage = {
    getItem: (key) => valores.get(key) ?? null,
    setItem: (key, value) => valores.set(key, String(value)),
    removeItem: (key) => valores.delete(key),
  };
  globalThis.window = new EventTarget();
  cierres = 0;
  window.addEventListener(SESION_CERRADA, () => { cierres += 1; });
});

test("403 de cambio obligatorio pide restauracion sin borrar token; respuesta vieja no redirige", async () => {
  guardarSesion("token-sintetico", usuarioServidor);
  let cambios = 0;
  window.addEventListener(CAMBIO_PASSWORD_REQUERIDO, () => { cambios++; });
  const api = crearApi((config) => Promise.reject(new axios.AxiosError("Cambio obligatorio", "ERR_BAD_RESPONSE", config,
    undefined, responder(config, { codigo: "PASSWORD_CHANGE_REQUIRED" }, 403))));
  await assert.rejects(api.get("/limpiezas"));
  assert.equal(cambios, 1);
  assert.equal(obtenerToken(), "token-sintetico");
  assert.equal(cierres, 0);
  let responderVieja;
  const apiTardia = crearApi((config) => new Promise((_resolve, reject) => {
    responderVieja = () => reject(new axios.AxiosError("Respuesta vieja", "ERR_BAD_RESPONSE", config,
      undefined, responder(config, { codigo: "PASSWORD_CHANGE_REQUIRED" }, 403)));
  }));
  const pendiente = apiTardia.get("/limpiezas");
  await new Promise((resolve) => setImmediate(resolve));
  guardarSesion("token-distinto", usuarioServidor);
  responderVieja();
  await assert.rejects(pendiente);
  assert.equal(cambios, 1);
});

test("nueva sesion tras password reemplaza token; respuesta antigua no pisa otro login", () => {
  guardarSesion("token-anterior", usuarioServidor);
  const expiraEn = Math.floor(Date.now() / 1000) + 7200;
  const usuarioSQL = { ...usuarioServidor, origenAutenticacion: "sql", gestionCuentasDisponible: true, debeCambiarPassword: false, versionRegistro: "0000000000000001" };
  const sesion = aplicarRespuestaSesion({ token: "token-nuevo", usuario: usuarioSQL, expiraEn }, "token-anterior");
  assert.equal(sesion.usuario.debeCambiarPassword, false);
  assert.equal(obtenerToken(), "token-nuevo");
  assert.equal(aplicarRespuestaSesion({ token: "token-viejo", usuario: usuarioSQL, expiraEn }, "token-anterior"), null);
  assert.equal(obtenerToken(), "token-nuevo");
});

test("logout confirma revocacion y limpia localmente tambien ante fallo del servidor", async () => {
  for (const falla of [false, true]) {
    guardarSesion("token-sintetico", usuarioServidor);
    const api = crearApi((config) => {
      assert.equal(config.timeout, 10000);
      return falla ? rechazar(config, 503) : Promise.resolve(responder(config, { revocadaEnServidor: true }));
    });
    assert.equal(await cerrarSesionEnServidor(api), !falla);
    assert.equal(obtenerToken(), null);
  }
});

test("restauracion SQL exige flag obligatorio, revision y rol permitido", async () => {
  const expiraEn = Math.floor(Date.now() / 1000) + 7200;
  const usuarioSQL = { ...usuarioServidor, origenAutenticacion: "sql", gestionCuentasDisponible: true, debeCambiarPassword: true, versionRegistro: "0000000000000001" };
  const api = crearApi(async (config) => responder(config, { usuario: usuarioSQL, expiraEn }));
  assert.equal((await consultarSesion(api)).usuario.debeCambiarPassword, true);
  for (const reemplazo of [{ rol: "Propietario" }, { debeCambiarPassword: undefined }, { versionRegistro: undefined }]) {
    await assert.rejects(consultarSesion(crearApi(async (config) => responder(config, { usuario: { ...usuarioSQL, ...reemplazo }, expiraEn }))));
  }
});

const usuarioServidor = {
  idUsuario: 900001,
  nombre: "Cuenta de prueba",
  email: "prueba@example.invalid",
  rol: "Operador",
  origenAutenticacion: "mock",
  gestionCuentasDisponible: false,
  debeCambiarPassword: false,
  permisos: ["reservas.ver", "reservas.modificar"],
};

function crearApi(adapter) {
  const api = axios.create({ adapter });
  configurarAutenticacion(api);
  return api;
}

function responder(config, data = {}, status = 200) {
  return { config, data, status, statusText: "", headers: {} };
}

function rechazar(config, status) {
  return Promise.reject(new axios.AxiosError(
    "Respuesta de prueba", "ERR_BAD_RESPONSE", config,
    undefined, responder(config, {}, status)
  ));
}

test("Axios envía el token vigente y deja de enviarlo después del logout", async () => {
  const api = crearApi(async (config) => {
    assert.ok(config.headers.get("Authorization") ===
      (obtenerToken() ? `Bearer ${obtenerToken()}` : undefined));
    return responder(config);
  });
  guardarSesion("token-sintetico-1", usuarioServidor);
  await api.get("/reservas");
  guardarSesion("token-sintetico-2", usuarioServidor);
  await api.post("/integraciones/booking/simulacion/nueva-reserva");
  limpiarSesion();
  await api.get("/calendario");
  assert.equal(localStorage.getItem("usuario"), null);
});

test("un 401 de negocio borra la sesión y notifica a React", async () => {
  guardarSesion("token-sintetico", usuarioServidor);
  const api = crearApi((config) => rechazar(config, 401));
  await assert.rejects(api.get("/limpiezas"));
  assert.equal(obtenerToken(), null);
  assert.equal(localStorage.getItem("usuario"), null);
  assert.equal(cierres, 1);
});

test("401 del login no envía el token anterior ni borra otra sesión", async () => {
  guardarSesion("token-sintetico", usuarioServidor);
  const api = crearApi((config) => {
    assert.equal(config.headers.get("Authorization"), undefined);
    return rechazar(config, 401);
  });
  await assert.rejects(api.post("/auth/login"));
  assert.ok(obtenerToken() === "token-sintetico");
  assert.equal(cierres, 0);
});

test("un 401 tardío de otra sesión no cierra el login nuevo", async () => {
  guardarSesion("token-anterior-sintetico", usuarioServidor);
  let responderPendiente;
  const api = crearApi((config) => new Promise((_resolve, reject) => {
    responderPendiente = () => reject(new axios.AxiosError(
      "Respuesta tardía", "ERR_BAD_RESPONSE", config,
      undefined, responder(config, {}, 401)
    ));
  }));
  const peticion = api.get("/reservas");
  await new Promise((resolve) => setImmediate(resolve));
  guardarSesion("token-nuevo-sintetico", usuarioServidor);
  responderPendiente();
  await assert.rejects(peticion);
  assert.ok(obtenerToken() === "token-nuevo-sintetico");
  assert.equal(cierres, 0);
});

test("errores de red, 403 y 500 conservan la sesión", async () => {
  guardarSesion("token-sintetico", usuarioServidor);
  for (const status of [403, 500]) {
    const api = crearApi((config) => rechazar(config, status));
    await assert.rejects(api.get("/reservas"));
  }
  const api = crearApi(() => Promise.reject(new Error("Sin conexión")));
  await assert.rejects(consultarSesion(api));
  assert.ok(obtenerToken() === "token-sintetico");
  assert.equal(cierres, 0);
});

test("restaurar consulta al backend y no interpreta el usuario almacenado", async () => {
  guardarSesion("token-sintetico", usuarioServidor);
  localStorage.setItem("usuario", "{json corrupto o manipulado");
  const expiraEn = Math.floor(Date.now() / 1000) + 7200;
  const api = crearApi(async (config) => {
    assert.equal(config.url, "/auth/me");
    assert.equal(config.timeout, 15000);
    assert.ok(Boolean(config.headers.get("Authorization")));
    return responder(config, { usuario: usuarioServidor, expiraEn });
  });
  assert.deepEqual(await consultarSesion(api), { usuario: usuarioServidor, expiraEn });
});

test("una sesión vencida o una respuesta incompleta no habilitan el Dashboard", async () => {
  for (const data of [
    {},
    { usuario: usuarioServidor },
    { usuario: usuarioServidor, expiraEn: Math.floor(Date.now() / 1000) - 1 },
    { usuario: { idUsuario: 900001 }, expiraEn: Math.floor(Date.now() / 1000) + 7200 },
  ]) {
    const api = crearApi(async (config) => responder(config, data));
    await assert.rejects(consultarSesion(api));
  }
});

test("restaurar con token rechazado limpia la sesión", async () => {
  guardarSesion("token-invalido-sintetico", usuarioServidor);
  const api = crearApi((config) => rechazar(config, 401));
  await assert.rejects(consultarSesion(api));
  assert.equal(obtenerToken(), null);
  assert.equal(cierres, 1);
});

test("la sesión exige permisos del servidor y no deriva privilegios del rol almacenado", async () => {
  guardarSesion("token-sintetico", { ...usuarioServidor, rol: "Administrador" });
  const expiraEn = Math.floor(Date.now() / 1000) + 7200;
  const api = crearApi(async (config) => responder(config, { usuario: usuarioServidor, expiraEn }));
  const sesion = await consultarSesion(api);
  assert.ok(!sesion.usuario.permisos.includes("reservas.cancelar"));
  const { permisos: _permisos, ...sinPermisos } = usuarioServidor;
  const apiSinPermisos = crearApi(async (config) => responder(config, { usuario: sinPermisos, expiraEn }));
  await assert.rejects(consultarSesion(apiSinPermisos));
});
