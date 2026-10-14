import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

// Browser real ya instalado, sin dependencias nuevas y sin backend/SQL.
const browserPath = process.env.HOSTFLOW_TEST_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
// Contrato versionado de prueba: npm test lo contrasta con el backend cuando
// ambos checkouts estan disponibles. El browser funciona con frontend solo.
const contrato = JSON.parse(fs.readFileSync(new URL("../fixtures/permisos.json", import.meta.url), "utf8"));
const permisosDelRol = (rol) => contrato.permisosPorRol[rol] || [];

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
  let falloUsuarios = false;
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

    function api(method, ruta, body, params) {
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
      if (ruta === "/usuarios" && method === "GET") {
        if (falloUsuarios) return [503, { mensaje: "No se pudo completar la operación. Reintente más tarde." }];
        const busqueda = (params.get("busqueda") || "").toLowerCase();
        const estado = params.get("estado");
        const pagina = Number(params.get("pagina")) || 1;
        const lista = [...users.values()].filter(u => (!estado || u.estado === estado) &&
          (!busqueda || `${u.nombre} ${u.email}`.toLowerCase().includes(busqueda)));
        return [200, { usuarios: lista.slice((pagina - 1) * 25, pagina * 25), total: lista.length }];
      }
      if (ruta === "/usuarios" && method === "POST") {
        const u = { ...cuenta(users.size + 1, body.rol), nombre: body.nombre, email: body.email, debeCambiarPassword: true };
        users.set(u.idUsuario, u); return [201, { usuario: u }];
      }
      if (/^\/usuarios\/\d+/.test(ruta)) {
        const u = users.get(Number(ruta.split("/")[2]));
        if (ruta.endsWith("/estado")) {
          if (u.rol === "Administrador" && body.estado === "Inactivo" && [...users.values()].filter(x=>x.rol==='Administrador'&&x.estado==='Activo').length === 1) {
            return [409, { mensaje: "Debe quedar al menos un Administrador activo." }];
          }
          u.estado = body.estado;
        }
        else if (ruta.endsWith("/restablecer-password")) u.debeCambiarPassword = true;
        else { u.nombre = body.nombre; u.email = body.email; u.rol = body.rol; }
        return [200, { usuario: u }];
      }
      if (ruta === "/dashboard/resumen") {
        if (falloInicio) return [503, { mensaje: "Fallo inicial simulado" }];
        return [200, { resumen: { propiedadesActivas: 0, reservasActivas: 0, huespedesRegistrados: 0,
          ...(current.permisos.includes("dashboard.economia") ? { ingresosMes: 123456 } : {}),
          ocupacionMensual: 0, alertasPendientes: 0 }, proximasReservas: [], alertas: [] }];
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
        const ruta = url.pathname.slice(4); requests.push({ method: request.method, ruta, params: Object.fromEntries(url.searchParams) });
        const [status, data] = request.method === "OPTIONS" ? [204, {}] : api(request.method, ruta, request.postData ? JSON.parse(request.postData) : {}, url.searchParams);
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

    const capturar = async (nombre) => {
      if (!process.env.HOSTFLOW_TEST_VISUAL_DIR) return;
      assert.equal(await evaluate("[...document.querySelectorAll('input[id*=password], input[id*=cuenta-actual], input[id*=cuenta-nueva], input[id*=confirmacion]')].some(i=>i.value)"), false, "No capturar formularios con contraseñas.");
      const folder = path.resolve(process.env.HOSTFLOW_TEST_VISUAL_DIR);
      fs.mkdirSync(folder, { recursive: true });
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(folder, `${nombre}.png`), Buffer.from(data, "base64"));
    };

    const inicioVisible = "document.querySelector('.sidebar-nav button.active')?.textContent.trim()==='Inicio' && document.querySelector('.main h1')?.textContent.includes('¡Hola,')";
    const recargarInicio = async () => {
      await evaluate("document.body.dataset.beforeReload='1'");
      await send("Page.reload");
      await esperar(`!document.body.dataset.beforeReload && (${inicioVisible})`);
    };

    await t.test("Administrador inicia en Inicio y recarga sin sincronizar otros módulos", async () => {
      fase = "inicio Admin"; await login(); await esperar(inicioVisible);
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"),true);
      assert.equal(await evaluate("document.querySelector('.main').textContent.includes('Ingresos del mes')"),true);
      const previas = requests.length;
      await recargarInicio();
      assert.ok(requests.slice(previas).every(r=>['/auth/me','/dashboard/resumen','/dashboard/historico'].includes(r.ruta) && ['GET','OPTIONS'].includes(r.method)));
      await click('.sidebar-logout'); await esperar("Boolean(document.querySelector('#login-email'))");
    });

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
      await capturar("mi-cuenta-escritorio");
    });
    await t.test("sidebar colapsado y perfil en menu movil", async () => {
      fase = "movil"; await click(".sidebar-collapse-toggle");
      assert.equal(await evaluate("document.querySelector('.sidebar').classList.contains('sidebar--collapsed')"), true);
      await click(".sidebar-user"); await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await click(".mobile-menu-toggle"); await esperar("Boolean(document.querySelector('.mobile-nav-user'))");
      await click(".mobile-nav-user"); await esperar("!document.querySelector('.mobile-nav-user')");
      assert.equal(await evaluate("Boolean(document.querySelector('#cuenta-nombre'))"), true);
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, "Mi cuenta no debe desbordar en móvil.");
      await capturar("mi-cuenta-movil");
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    });
    await t.test("Usuarios: alta/edicion/estado/reset y validacion de password", async () => {
      fase = "usuarios";
      await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.includes('Usuarios')).click()");
      await esperar("document.querySelector('.security-table')!==null");
      await capturar("usuarios-escritorio");
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Nuevo usuario').click()");
      await esperar("Boolean(document.querySelector('dialog[open] #usuario-nombre'))");
      await capturar("usuario-formulario");
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
      const previasEstado = requests.filter(r=>r.ruta.endsWith('/estado')).length;
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[1].click()");
      await esperar("Boolean(document.querySelector('dialog.security-dialog--compact[open]'))");
      await click("dialog.security-dialog--compact .secondary-button");
      assert.equal(requests.filter(r=>r.ruta.endsWith('/estado')).length, previasEstado, "Cancelar no escribe.");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[1].click()");
      await esperar("Boolean(document.querySelector('dialog.security-dialog--compact[open]'))");
      await click("dialog.security-dialog--compact .security-danger-button");
      await esperar("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).textContent.includes('Inactivo')");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[1].click()");
      await esperar("Boolean(document.querySelector('dialog.security-dialog--compact[open]'))");
      await click("dialog.security-dialog--compact .primary-button");
      await esperar("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).textContent.includes('Activo') && !document.querySelector('dialog[open]')");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[1].click()");
      await esperar("Boolean(document.querySelector('dialog.security-dialog--compact[open]'))");
      await click("dialog.security-dialog--compact .security-danger-button");
      await esperar("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).textContent.includes('Inactivo') && !document.querySelector('dialog[open]')");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Editado aislado')).querySelectorAll('button')[2].click()");
      await fill("#usuario-password", password); await fill("#usuario-confirmacion", password);
      await evaluate("document.querySelector('#usuario-password').closest('form').requestSubmit()");
      await esperar("!document.querySelector('#usuario-password')");
      assert.equal(users.get(3).estado, "Inactivo");
    });
    await t.test("Usuarios: búsqueda, filtros, paginación, diálogos y móvil sin desbordes", async () => {
      fase = "lista responsive";
      await fill("#usuarios-busqueda", "no-existe");
      await evaluate("document.querySelector('.security-filters').requestSubmit()");
      await esperar("Boolean(document.querySelector('.security-empty-row'))");
      assert.equal(await evaluate("document.querySelector('.security-empty-row').textContent.includes('No encontramos usuarios')"), true);
      await click(".security-empty-row button");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===3");
      await evaluate("(()=>{const s=document.querySelector('#usuarios-estado'); s.value='Inactivo'; s.dispatchEvent(new Event('change',{bubbles:true}))})()");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===1 && document.querySelector('.security-table').textContent.includes('Editado aislado')");
      await click(".security-filters .security-text-button");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===3");
      for(let id=4;id<=28;id++) users.set(id,cuenta(id,"Operador"));
      await evaluate("document.querySelector('.security-filters').requestSubmit()");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===25");
      await click("button[aria-label='Página siguiente']");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===3 && document.querySelector('.security-pagination').textContent.includes('Página 2 de 2')");
      await fill("#usuarios-busqueda", "editado");
      await evaluate("document.querySelector('.security-filters').requestSubmit()");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===1 && document.querySelector('.security-pagination').textContent.includes('Página 1 de 1')");
      for(let id=4;id<=28;id++) users.delete(id);
      await click(".security-filters .security-text-button");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===3");
      await evaluate("(()=>{const opener=[...document.querySelectorAll('button')].find(b=>b.textContent==='Nuevo usuario'); opener.focus(); opener.click()})()");
      await esperar("Boolean(document.querySelector('dialog[open]'))");
      await fill("#usuario-password",password);
      assert.equal(await evaluate("document.querySelector('#usuario-password').type"),"password");
      await click("button[aria-label='Mostrar contraseña temporal']");
      assert.equal(await evaluate("document.querySelector('#usuario-password').type"),"text");
      await click("button[aria-label='Ocultar contraseña temporal']");
      assert.equal(await evaluate("document.querySelector('#usuario-password').type"),"password");
      await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
      await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
      await esperar("!document.querySelector('dialog[open]')");
      assert.equal(await evaluate("document.activeElement.textContent==='Nuevo usuario'"),true,"Escape devuelve el foco.");
      await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true,"Usuarios no debe desbordar en móvil.");
      await capturar("usuarios-movil");
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Nuevo usuario').click()");
      await esperar("Boolean(document.querySelector('dialog[open] #usuario-nombre'))");
      assert.equal(await evaluate("(()=>{const d=document.querySelector('dialog[open]');return d.getBoundingClientRect().width <= innerWidth && d.scrollWidth <= d.clientWidth})()"),true,"Formulario móvil sin desborde.");
      await capturar("usuario-formulario-movil");
      await click("dialog[open] .security-close");
      for (const width of [320,360,820]) {
        await send("Emulation.setDeviceMetricsOverride",{width,height:844,deviceScaleFactor:1,mobile:width<700});
        assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true,`Usuarios sin desbordes a ${width}px.`);
      }
      await send("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    });
    await t.test("cambios sensibles propios requieren confirmación y cancelar no envía la edición", async () => {
      fase = "confirmacion propia";
      const previas = requests.filter(r=>r.method==='PUT').length;
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Tu cuenta')).querySelector('button').click()");
      await esperar("Boolean(document.querySelector('#usuario-rol'))");
      await evaluate("(()=>{const s=document.querySelector('#usuario-rol');s.value='Operador';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
      await evaluate("document.querySelector('.security-user-form').requestSubmit()");
      await esperar("Boolean(document.querySelector('dialog.security-dialog--compact[open]'))");
      await click("dialog.security-dialog--compact .secondary-button");
      assert.equal(requests.filter(r=>r.method==='PUT').length,previas);
      assert.equal(current.rol,'Administrador');
      await click("dialog[open] .security-close");
      await click(".sidebar-user");
      await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      for(const width of [320,360,820]) {
        await send("Emulation.setDeviceMetricsOverride",{width,height:844,deviceScaleFactor:1,mobile:width<700});
        assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true,`Mi cuenta sin desbordes a ${width}px.`);
      }
      await send("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    });
    await t.test("errores de listado y protección del último Admin se presentan sin alterar cuentas", async () => {
      fase = "errores de cuentas"; falloUsuarios = true;
      await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.includes('Usuarios')).click()");
      await esperar("document.querySelector('[role=alert]')?.textContent.includes('Reintente')");
      falloUsuarios = false;
      await evaluate("[...document.querySelectorAll('[role=alert] button')].find(b=>b.textContent==='Recargar datos').click()");
      await esperar("document.querySelectorAll('.security-table tbody tr').length===3 && !document.querySelector('[role=alert]')");
      await evaluate("[...document.querySelectorAll('.security-table tbody tr')].find(r=>r.textContent.includes('Tu cuenta')).querySelectorAll('button')[1].click()");
      await esperar("Boolean(document.querySelector('dialog.security-dialog--compact[open]'))");
      await click("dialog.security-dialog--compact .security-danger-button");
      await esperar("!document.querySelector('dialog[open]') && document.querySelector('[role=alert]')?.textContent.includes('Administrador activo')");
      assert.equal(current.estado,'Activo');
      assert.equal(current.rol,'Administrador');
      await click(".sidebar-user");
      await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
    });
    await t.test("cambio obligatorio no monta negocio; actual incorrecta falla y nueva rota sesion", async () => {
      fase = "password"; obligatorio = true;
      const previas = requests.length; await send("Page.reload"); await esperar("Boolean(document.querySelector('#cuenta-actual')) && !document.querySelector('.sidebar')");
      assert.equal(await evaluate("Boolean(document.querySelector('.sidebar'))"), false);
      assert.equal(requests.slice(previas).some(r=>r.ruta.startsWith('/dashboard')), false);
      await fill("#cuenta-actual", "incorrecta"); await fill("#cuenta-nueva", password + "nueva"); await fill("#cuenta-confirmacion", password + "nueva");
      await evaluate("document.querySelector('#cuenta-actual').closest('form').requestSubmit()");
      await esperar("document.querySelector('[role=alert]')?.textContent.includes('actual no es correcta')");
      const anterior = await evaluate("localStorage.getItem('token')");
      await fill("#cuenta-actual", password); await evaluate("document.querySelector('#cuenta-actual').closest('form').requestSubmit()");
      await esperar("Boolean(document.querySelector('.sidebar'))");
      assert.equal(await evaluate("localStorage.getItem('token')") === anterior, false);
      await esperar(inicioVisible);
      assert.equal(await evaluate("Boolean(document.querySelector('#cuenta-nombre'))"), false);
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
    await t.test("actualizacion fallida conserva datos y advierte hasta reintentar", async () => {
      fase = "datos retenidos";
      await login(); await esperar("Boolean(document.querySelector('.sidebar'))");
      const antes = await evaluate("document.querySelector('.main .card h2').textContent");
      falloInicio = true;
      await evaluate("document.dispatchEvent(new Event('visibilitychange'))");
      await esperar("Boolean(document.querySelector('.dashboard-refresh-error'))");
      assert.equal(await evaluate("document.querySelector('.main .card h2').textContent"), antes);
      assert.equal(await evaluate("document.querySelector('.dashboard-refresh-error').textContent.includes('última carga correcta')"), true);
      falloInicio = false;
      await click(".dashboard-refresh-error button");
      await esperar("!document.querySelector('.dashboard-refresh-error')");
      await click(".sidebar-logout"); await esperar("Boolean(document.querySelector('#login-email'))");
    });
    await t.test("Operador inicia y recarga Inicio sin economía ni Usuarios; conserva Mi cuenta", async () => {
      fase = "inicio Operador"; current = users.get(2); await login(); await esperar(inicioVisible);
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"), false);
      assert.equal(await evaluate("document.querySelector('.main').textContent.includes('Ingresos del mes')"),false);
      assert.equal(await evaluate("document.querySelector('.main').textContent.includes('123.456')"),false);
      const previas = requests.length;
      await recargarInicio();
      assert.ok(requests.slice(previas).every(r=>['/auth/me','/dashboard/resumen','/dashboard/historico'].includes(r.ruta) && ['GET','OPTIONS'].includes(r.method)));
      await click('.sidebar-user'); await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      await recargarInicio();
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"),false);
    });
    await t.test("Operador navega modulos, no ve Usuarios y cierra sesion", async () => {
      fase = "operador";
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
