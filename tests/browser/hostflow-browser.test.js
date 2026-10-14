import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

// Browser real ya instalado, sin dependencias nuevas y sin backend/SQL.
const browserPath = process.env.HOSTFLOW_TEST_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const require = createRequire(import.meta.url);
const { permisosDelRol } = require("../../../backend/src/config/permisos.js");

class CDP {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    socket.addEventListener("message", ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id) {
        const p = this.pending.get(msg.id); if (!p) return;
        this.pending.delete(msg.id); clearTimeout(p.timer);
        if (msg.error) p.reject(new Error("Error del protocolo de navegador.")); else p.resolve(msg.result);
      } else this.handlers.get(msg.method)?.(msg.params);
    });
  }
  async send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Timeout CDP: ${method}`)); }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(method, handler) { this.handlers.set(method, handler); }
}

test("navegador real: sesiones, cuentas, perfil, movil y regresion con API aislada", {
  skip: !fs.existsSync(browserPath), timeout: 120000,
}, async (t) => {
  let vite, child, socket, cdp;
  let fase = "inicio";
  const password = randomBytes(20).toString("hex");
  const cuenta = (id, rol) => ({ idUsuario: id, nombre: `${rol} aislado`, email: `${rol.toLowerCase()}@example.invalid`,
    rol, permisos: permisosDelRol(rol), origenAutenticacion: "sql", gestionCuentasDisponible: true,
    debeCambiarPassword: false, estado: "Activo", versionRegistro: "0000000000000001" });
  const users = new Map([[1, cuenta(1, "Administrador")], [2, cuenta(2, "Operador")]]);
  let current = users.get(1), token = "token-aislado-1", nonce = 1;
  let obligatorio = false, falloSesion = false, falloInicio = false, caducada = false;
  const requests = []; const excepciones = [];
  try {
    vite = await createServer({ configFile: false, envDir: false, plugins: [react()],
      server: { host: "127.0.0.1", port: 0, ws: false, watch: null } });
    await vite.listen();
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hostflow-browser-isolated-"));
    child = spawn(browserPath, ["--headless=new", "--disable-gpu", "--disable-background-networking", "--disable-sync",
      "--no-first-run", "--no-default-browser-check", "--no-proxy-server", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const debugUrl = await new Promise((resolve, reject) => {
      const poll = setInterval(() => {
        const portFile = path.join(profile, "DevToolsActivePort");
        if (fs.existsSync(portFile)) {
          const [port, endpoint] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
          if (/^\d+$/.test(port) && endpoint?.startsWith("/devtools/browser/")) {
            clearTimeout(timer); clearInterval(poll); resolve(`ws://127.0.0.1:${port}${endpoint}`);
          }
        }
      }, 100);
      const timer = setTimeout(() => { clearInterval(poll); reject(new Error("No se inició el navegador aislado.")); }, 15000);
      child.once("error", () => { clearTimeout(timer); clearInterval(poll); reject(new Error("No se pudo iniciar el navegador.")); });
      child.stderr.on("data", (data) => {
        const match = /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/.exec(String(data));
        if (match) { clearTimeout(timer); clearInterval(poll); resolve(match[1]); }
      });
    });
    socket = new WebSocket(debugUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    cdp = new CDP(socket);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params) => cdp.send(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(`Error DOM en ${fase}.`);
      return result.result.value;
    };
    const esperar = async (expression) => {
      for (let n = 0; n < 100; n++) {
        if (await evaluate(expression)) return;
        await new Promise((r) => setTimeout(r, 80));
      }
      throw new Error(`No se cumplió la condición DOM en ${fase}.`);
    };
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const fill = (selector, value) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)});
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});
      el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    const expiry = () => Math.floor(Date.now() / 1000) + 7200;
    const sesion = () => ({ token, usuario: { ...current, debeCambiarPassword: obligatorio }, expiraEn: expiry() });

    function api(method, ruta, body) {
      if (ruta === "/auth/login") {
        if (body.email !== current.email || body.password !== password) return [401, { mensaje: "El correo o la contraseña no son válidos." }];
        token = `token-aislado-${++nonce}`; caducada = false; return [200, sesion()];
      }
      if (ruta === "/auth/me" && method === "GET") {
        if (falloSesion) return [503, { mensaje: "Error temporal simulado" }];
        if (caducada) return [401, { mensaje: "Sesión vencida" }];
        return [200, sesion()];
      }
      if (ruta === "/auth/logout") return [200, { revocadaEnServidor: true }];
      if (ruta === "/auth/cambiar-password") {
        if (body.passwordActual !== password) return [400, { mensaje: "La contraseña actual no es correcta." }];
        obligatorio = false; token = `token-aislado-${++nonce}`; current.versionRegistro = "0000000000000002";
        return [200, sesion()];
      }
      if (ruta === "/auth/me" && method === "PATCH") { current.nombre = body.nombre; return [200, { usuario: sesion().usuario }]; }
      if (ruta === "/roles") return [200, { roles: [{ nombre: "Administrador" }, { nombre: "Operador" }] }];
      if (ruta === "/usuarios" && method === "GET") return [200, { usuarios: [...users.values()], total: users.size }];
      if (ruta === "/usuarios" && method === "POST") {
        const u = { ...cuenta(users.size + 1, body.rol), nombre: body.nombre, email: body.email, debeCambiarPassword: true };
        users.set(u.idUsuario, u); return [201, { usuario: u }];
      }
      if (/^\/usuarios\/\d+/.test(ruta)) {
        const u = users.get(Number(ruta.split("/")[2]));
        if (ruta.endsWith("/estado")) u.estado = body.estado;
        else if (ruta.endsWith("/restablecer-password")) u.debeCambiarPassword = true;
        else { u.nombre = body.nombre; u.email = body.email; u.rol = body.rol; }
        return [200, { usuario: u }];
      }
      if (ruta === "/dashboard/resumen") {
        if (falloInicio) return [503, { mensaje: "Fallo inicial simulado" }];
        return [200, { resumen: { propiedadesActivas: 0, reservasActivas: 0, huespedesRegistrados: 0, ingresosMes: 0, ocupacionMensual: 0, alertasPendientes: 0 }, proximasReservas: [], alertas: [] }];
      }
      if (ruta === "/dashboard/historico") return [200, { historico: [] }];
      if (ruta === "/dashboard/reportes/opciones") return [200, { opciones: { propiedades: [], canales: [], estados: [] } }];
      if (ruta === "/dashboard/reportes") return [200, { reportes: { periodo: { fechaDesde: "2026-10-01", fechaHasta: "2026-10-31", tipo: "mensual" }, filtros: {}, resumen: { totalReservasPeriodo: 0, totalReservasOperativas: 0, reservasConIngreso: 0, ingresosEstimados: 0, nochesOcupadas: 0, nochesDisponibles: 0, ocupacionPromedio: 0 }, historico: [], porCanal: [], porEstado: [], porPropiedad: [] } }];
      if (ruta === "/calendario") return [200, { anio: 2026, mes: 10, diasMes: 31, propiedades: [], resumen: { reservas: 0 } }];
      if (ruta === "/recomendaciones") return [200, { recomendaciones: [], resumen: { total: 0 }, contexto: {} }];
      const modulo = ruta.split("/")[1];
      if (["propiedades", "reservas", "huespedes", "alertas", "limpiezas"].includes(modulo)) return [200, { [modulo]: [], resumen: { total: 0, pendientes: 0, enProgreso: 0, completadas: 0, canceladas: 0, urgentes: 0 } }];
      return [404, { mensaje: "Ruta no prevista en la API aislada" }];
    }

    cdp.on("Runtime.exceptionThrown", () => excepciones.push(fase));
    cdp.on("Page.javascriptDialogOpening", () => { send("Page.handleJavaScriptDialog", { accept: true }).catch(() => excepciones.push("dialogo")); });
    cdp.on("Fetch.requestPaused", async ({ requestId, request }) => {
      try {
        const url = new URL(request.url);
        if (url.origin === base) { await send("Fetch.continueRequest", { requestId }); return; }
        if (url.hostname !== "127.0.0.1" || !url.pathname.startsWith("/api/")) {
          await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }); return;
        }
        const ruta = url.pathname.slice(4); requests.push({ method: request.method, ruta });
        const [status, data] = request.method === "OPTIONS" ? [204, {}] : api(request.method, ruta, request.postData ? JSON.parse(request.postData) : {});
        await send("Fetch.fulfillRequest", { requestId, responseCode: status,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: base },
            { name: "Access-Control-Allow-Headers", value: "authorization,content-type" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,OPTIONS" }],
          body: Buffer.from(status === 204 ? "" : JSON.stringify(data)).toString("base64") });
      } catch { excepciones.push("API aislada"); }
    });
    await send("Runtime.enable"); await send("Page.enable"); await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await send("Page.bringToFront");
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: base });
    await esperar("Boolean(document.querySelector('#login-email'))");
    const login = async () => {
      await fill("#login-email", current.email); await fill("#login-password", password);
      await evaluate("document.querySelector('.login-card').requestSubmit()");
    };

    await t.test("login y perfil por teclado; sin opcion duplicada", async () => {
      fase = "perfil";
      await fill("#login-email", current.email); await fill("#login-password", "incorrecta");
      await evaluate("document.querySelector('.login-card').requestSubmit()");
      await esperar("document.querySelector('.error')?.textContent.includes('válidos')");
      assert.equal(await evaluate("localStorage.getItem('token')"), null);
      await login(); await esperar("Boolean(document.querySelector('.sidebar-user'))");
      assert.equal(await evaluate("[...document.querySelectorAll('.sidebar-nav button')].some(b=>b.textContent.includes('Mi cuenta'))"), false);
      await evaluate("document.querySelector('.sidebar-user').focus()");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      assert.equal(await evaluate("document.querySelector('.sidebar-user').getAttribute('aria-current')"), "page");
      await fill("#cuenta-nombre", "Nombre actualizado"); await evaluate("document.querySelector('#cuenta-nombre').closest('form').requestSubmit()");
      await esperar("document.querySelector('.sidebar-user').textContent.includes('Nombre actualizado')");
    });
    await t.test("sidebar colapsado y perfil en menu movil", async () => {
      fase = "movil"; await click(".sidebar-collapse-toggle");
      assert.equal(await evaluate("document.querySelector('.sidebar').classList.contains('sidebar--collapsed')"), true);
      await click(".sidebar-user"); await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await click(".mobile-menu-toggle"); await esperar("Boolean(document.querySelector('.mobile-nav-user'))");
      await click(".mobile-nav-user"); await esperar("!document.querySelector('.mobile-nav-user')");
      assert.equal(await evaluate("Boolean(document.querySelector('#cuenta-nombre'))"), true);
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    });
    await t.test("Usuarios: alta/edicion/estado/reset y validacion de password", async () => {
      fase = "usuarios";
      await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.includes('Usuarios')).click()");
      await esperar("document.querySelector('.security-table')!==null");
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Nuevo usuario').click()");
      await fill("#usuario-nombre", "Nuevo aislado"); await fill("#usuario-email", "nuevo@example.invalid");
      await fill("#usuario-password", "corta"); await fill("#usuario-confirmacion", "corta");
      await evaluate("document.querySelector('#usuario-nombre').closest('form').requestSubmit()");
      await esperar("Boolean(document.querySelector('[role=alert]'))");
      assert.equal(users.size, 2);
      await fill("#usuario-password", password); await fill("#usuario-confirmacion", password);
      await evaluate("document.querySelector('#usuario-nombre').closest('form').requestSubmit()");
      await esperar("!document.querySelector('#usuario-nombre')"); assert.equal(users.size, 3);
      await esperar("document.querySelectorAll('.security-table tbody tr').length===3");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Nuevo aislado')).querySelector('button').click()");
      await fill("#usuario-nombre", "Editado aislado"); await evaluate("document.querySelector('#usuario-nombre').closest('form').requestSubmit()");
      await esperar("document.querySelector('.security-table').textContent.includes('Editado aislado')");
      await evaluate("window.confirm=()=>true; [...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[1].click()");
      await esperar("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).textContent.includes('Inactivo')");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[2].click()");
      await fill("#usuario-password", password); await fill("#usuario-confirmacion", password);
      await evaluate("document.querySelector('#usuario-password').closest('form').requestSubmit()");
      await esperar("!document.querySelector('#usuario-password')");
      assert.equal(users.get(3).estado, "Inactivo");
    });
    await t.test("cambio obligatorio no monta negocio; actual incorrecta falla y nueva rota sesion", async () => {
      fase = "password"; obligatorio = true;
      const previas = requests.length; await send("Page.reload"); await esperar("Boolean(document.querySelector('#cuenta-actual'))");
      assert.equal(await evaluate("Boolean(document.querySelector('.sidebar'))"), false);
      assert.equal(requests.slice(previas).some(r=>r.ruta.startsWith('/dashboard')), false);
      await fill("#cuenta-actual", "incorrecta"); await fill("#cuenta-nueva", password + "nueva"); await fill("#cuenta-confirmacion", password + "nueva");
      await evaluate("document.querySelector('#cuenta-actual').closest('form').requestSubmit()");
      await esperar("document.querySelector('[role=alert]')?.textContent.includes('actual no es correcta')");
      const anterior = await evaluate("localStorage.getItem('token')");
      await fill("#cuenta-actual", password); await evaluate("document.querySelector('#cuenta-actual').closest('form').requestSubmit()");
      await esperar("Boolean(document.querySelector('.sidebar'))");
      assert.equal(await evaluate("localStorage.getItem('token')") === anterior, false);
    });
    await t.test("fallos temporales de sesion/dashboard permiten reintentar; vencimiento cierra", async () => {
      fase = "recuperacion"; falloSesion = true; await send("Page.reload");
      await esperar("document.querySelector('[role=alert]')?.textContent.includes('verificar')");
      falloSesion = false;
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reintentar').click()");
      await esperar("Boolean(document.querySelector('.sidebar'))");
      falloInicio = true; await send("Page.reload"); await esperar("document.querySelector('[role=alert]')?.textContent.includes('cargar el inicio')");
      falloInicio = false;
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reintentar').click()"); await esperar("Boolean(document.querySelector('.sidebar'))");
      caducada = true; await send("Page.reload"); await esperar("Boolean(document.querySelector('#login-email'))");
      assert.equal(await evaluate("localStorage.getItem('token')"), null);
    });
    await t.test("Operador navega modulos, no ve Usuarios y cierra sesion", async () => {
      fase = "operador"; current = users.get(2); await login(); await esperar("Boolean(document.querySelector('.sidebar'))");
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"), false);
      for (const label of ["Propiedades", "Reservas", "Huéspedes", "Calendario", "Limpiezas", "Alertas", "Reportes"]) {
        await evaluate(`[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
        await new Promise((r) => setTimeout(r, 150));
        assert.equal(await evaluate("Boolean(document.querySelector('.sidebar'))"), true);
      }
      await click("button[aria-label='Abrir FlowIA']"); await esperar("Boolean(document.querySelector('[aria-label=FlowIA]'))");
      await click(".sidebar-logout"); await esperar("Boolean(document.querySelector('#login-email'))");
      assert.equal(await evaluate("localStorage.getItem('token')"), null);
    });
    assert.equal(excepciones.length, 0, "El navegador no debe tener excepciones en los flujos probados.");
  } catch { throw new Error(`Falló el navegador aislado en ${fase} (estado del proceso: ${child?.exitCode ?? "activo"}); no se imprimieron credenciales ni tokens.`); }
  finally {
    if (cdp && socket?.readyState === WebSocket.OPEN) {
      try { await cdp.send("Browser.close"); } catch { /* El navegador puede cerrar el socket antes de responder. */ }
    }
    socket?.close(); child?.kill(); await vite?.close();
  }
});
