import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { propiedadVisual, reservaVisual, huespedVisual, limpiezaVisual, alertaVisual, calendarioVisual, reportesVisuales, recomendacionVisual } from "../fixtures/visual-modulos.js";
import { probarPrioridades } from './casos-prioritarios.js';
import { probarNotificaciones } from './casos-notificaciones.js';
import { probarRegresionIntegral } from './casos-integrales.js';
import { probarOperacionesExplicitas } from './casos-operaciones-explicitas.js';
import { probarCreacionAtomica } from './casos-creacion-atomica.js';
import { probarFormularioReservas } from './casos-formulario-reservas.js';
import { probarMonedas } from './casos-monedas.js';
import {crearApiJornadaMonetaria} from './api-jornada-monetaria.js';
import {probarJornadaMonetaria} from './casos-jornada-monetaria.js';
import {probarCierreNocturno} from './casos-cierre-nocturno.js';
import {probarPulidoUX} from './casos-pulido-ux.js';
import {probarReportesVisuales} from './casos-reportes-visuales.js';
import { fechaNegocio } from '../../src/services/monedasCalculos.js';
import { TIPOS_NOTIFICACION } from '../../src/services/notificaciones.js';
import { cacheViteAislada } from '../helpers/cacheVite.js';

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
  skip: !fs.existsSync(browserPath), timeout: 240000,
}, async (t) => {
  let vite, child, socket, cdp,apiUniversitaria;
  const cache = cacheViteAislada();
  let fase = "inicio";
  const password = randomBytes(20).toString("hex");
  const cuenta = (id, rol) => ({ idUsuario: id, nombre: `${rol} aislado`, email: `${rol.toLowerCase()}@example.invalid`,
    rol, permisos: permisosDelRol(rol), origenAutenticacion: "sql", gestionCuentasDisponible: true,
    debeCambiarPassword: false, estado: "Activo", versionRegistro: "0000000000000001" });
  const users = new Map([[1, cuenta(1, "Administrador")], [2, cuenta(2, "Operador")]]);
  let current = users.get(1), token = "token-aislado-1", nonce = 1;
  let obligatorio = false, falloSesion = false, falloInicio = false, caducada = false;
  let aceptarDialogo = true;
  const dialogosNativos = [];
  let falloUsuarios = false;
  let datosVisuales = false;
  let configuracionActivada = true, falloGuardarConfiguracion = false, conflictoConfiguracion = false, demoraPredeterminados = 0;
  let demoraGuardarConfiguracion = 0, respuestaConfiguracionIncompleta = false;
  let predeterminadosInvalidos = false, falloCargaConfiguracion = false, caducaEn = null;
  let soloLecturaConfiguracion = false, estadoConfiguracionAusente = false;
  let modoDetalleHuesped = 'normal', demoraDetalleHuesped = 0, listaHuespedesLarga = false;
  let falloRedPredeterminados = false;
  let falloFlowIA = false, demoraFlowIA = 0;
  let destinoFlowIA = null;
  let modoFlowIA = 'normal', demoraReservaAnterior = 0, detalleReservaIncompleto = false, dosReservas = false;
  let falloMantenimiento = false;
  let falloAltaReserva = false;
  const altasReservas = [];
  let formularioRealPrueba = false, modoPropiedadesReserva = 'normal', modoHuespedesReserva = 'normal', demoraCatalogosReserva = 0;
  let falloEdicionReserva = '', falloCancelacionReserva = false;
  let reservaFormulario = null;
  const cambiosReservas = [];
  let monedasActivas=false,monedasEscritura=false,falloBcraMonedas=false,falloGuardadoMonedas='',configMonedas=null,tarifasMonedas=[],avisoTarifaMonedas=false,revisionMonedas=100;
  const jornada=crearApiJornadaMonetaria(),soloJornada=process.env.HOSTFLOW_TEST_JORNADA_ONLY==='1',soloNocturno=process.env.HOSTFLOW_TEST_NOCTURNO_ONLY==='1',soloPulido=process.env.HOSTFLOW_TEST_PULIDO_ONLY==='1';
  let modoAvisos='datos',demoraAvisos=0,modoPreferencias='pendiente',conflictoPreferencias=false,demoraPreferencias=0,sinNotificaciones=false,revisionPreferencias=100;
  const preferenciasPorUsuario=new Map();
  const solicitudesAbortadas = new Set();
  let revisionConfiguracion = 2;
  let empresaConfiguracion = {nombreComercial:'Alojamientos ficticios',razonSocial:'',correoContacto:'contacto@example.invalid',telefono:'',pais:'',provincia:'',ciudad:'',direccion:'',informacionAdicional:'',versionRegistro:'0000000000000001'};
  let operativasConfiguracion = {horaIngreso:'15:00',horaEgreso:'10:00',zonaHoraria:'America/Argentina/Buenos_Aires',versionRegistro:'0000000000000002'};
  const requests = []; const excepciones = []; const modulosCliente = [];
  try {
    vite = await createServer({ configFile: false, envDir: false, cacheDir: cache.ruta, plugins: [react()],
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
      Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});
      el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    const expiry = () => caducaEn ?? Math.floor(Date.now() / 1000) + 7200;
    const sesion = () => ({ token, usuario: { ...current, ...(sinNotificaciones?{permisos:current.permisos.filter(p=>!p.startsWith('notificaciones.'))}:{}), debeCambiarPassword: obligatorio }, expiraEn: expiry() });

    function api(method, ruta, body, params) {
      if(apiUniversitaria&&/^\/(?:propiedades|huespedes|reservas|calendario|limpiezas|dashboard\/reportes)(?:\/|$)/.test(ruta))return apiUniversitaria.pedir(ruta+(params.size?'?'+params.toString():''),method,['GET','HEAD'].includes(method)?undefined:body,current.rol).then(r=>apiUniversitaria.transformar?.({method,ruta,params,respuesta:r})||[r.status,r.data]);
      const respuestaJornada=jornada.responder(method,ruta,body,params,current);if(respuestaJornada)return respuestaJornada;
      if(ruta.startsWith('/monedas/')){
        if(ruta==='/monedas/estado')return [200,{activado:monedasActivas,escritura:monedasEscritura,persistencia:monedasActivas?'sql':'pendiente',fechaNegocio:fechaNegocio(),fuentes:[{id:'MANUAL',disponible:true},{id:'BCRA',disponible:true},{id:'BNA',disponible:false}]}];
        if(ruta==='/monedas/consultar-bcra')return falloBcraMonedas?[503,{mensaje:'Fuente oficial ficticia no disponible.'}]:[200,{cotizacion:{id:'consulta-oficial-ficticia',fuente:'BCRA',tipo:'BCRA_TIPO_COTIZACION',valor:'1250.00000000',fecha:fechaNegocio(),horaPublicacion:null,consultadaEn:new Date().toISOString()},persistida:false}];
        if(ruta==='/monedas/alertas')return [200,{disponible:monedasActivas,motivo:monedasActivas?'':'Referencias pendientes de aprobación.',alertas:avisoTarifaMonedas?[1,2].map(i=>({id:`tarifa-ficticia-${i}`,idPropiedad:1,propiedad:'Alojamiento ficticio',titulo:'Revisar tarifa en ARS',mensaje:'La equivalencia de referencia varió -20.00 %. El precio no cambió.',fuente:'BCRA',tipo:'BCRA_TIPO_COTIZACION',fecha:fechaNegocio()})):[]}];
        if(!monedasActivas)return [503,{codigo:'MONEDAS_PENDIENTES',mensaje:'Persistencia pendiente.'}];
        if(ruta==='/monedas/tarifas'&&method==='GET')return [200,{tarifas:tarifasMonedas}];
        if(method==='GET'&&ruta==='/monedas/configuracion')return current.rol==='Administrador'?[200,{configuracion:configMonedas}]:[403,{mensaje:'Sin permiso.'}];
        if(['PUT','POST'].includes(method)){
          if(current.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];
          if(!monedasEscritura)return [503,{codigo:'MONEDAS_SOLO_LECTURA',mensaje:'Solo lectura.'}];
          if(falloGuardadoMonedas)return [falloGuardadoMonedas==='conflicto'?409:500,{codigo:falloGuardadoMonedas==='conflicto'?'MONEDAS_CONFLICTO':'OPERACION_RESULTADO_INCIERTO',mensaje:'Recargá los datos antes de reintentar.'}];
          const revision=(++revisionMonedas).toString(16).padStart(16,'0');
          if(ruta==='/monedas/configuracion'){
            configMonedas={fuente:body.fuente,tipo:body.fuente==='MANUAL'?'MANUAL':'BCRA_TIPO_COTIZACION',valor:body.fuente==='MANUAL'?body.valor:'1250.00000000',fecha:fechaNegocio(),consultadaEn:new Date().toISOString(),versionRegistro:revision,idAutor:current.idUsuario};return [200,{configuracion:configMonedas}];
          }
          if(ruta==='/monedas/tarifas/1'){
            const tarifa={idPropiedad:1,nombre:propiedadVisual.nombre,moneda:body.moneda,precio:body.precio,versionRegistro:revision,referencia:configMonedas};tarifasMonedas=[tarifa];return [200,{tarifa}];
          }
        }
        return [404,{mensaje:'Contrato de monedas no previsto.'}];
      }
      if (formularioRealPrueba) {
        if (method === 'GET' && ['/propiedades','/huespedes'].includes(ruta)) {
          const propiedades = ruta === '/propiedades', modo = propiedades ? modoPropiedadesReserva : modoHuespedesReserva;
          if (modo === 'error') return [503,{mensaje:'Carga ficticia no disponible.'}];
          if (modo === 'prohibido') return [403,{mensaje:'Sin permiso.'}];
          const campo = propiedades ? 'propiedades' : 'huespedes';
          if (modo === 'incompleto') return [200,{[campo]:{}}];
          const lista = propiedades ? [...Array.from({length:65},(_,i)=>({...propiedadVisual,idPropiedad:i+100,nombre:`Propiedad ficticia ${i}`})),{...propiedadVisual,idPropiedad:5,nombre:'HF-PILOTO-FICTICIO'}]
            : [...Array.from({length:65},(_,i)=>({...huespedVisual,idHuesped:i+300})),{...huespedVisual,idHuesped:17,nombre:'Prueba',apellido:'HF-PILOTO-FICTICIO'}];
          return [200,{[campo]:modo==='vacio'?[]:lista}];
        }
        if (method === 'GET' && ruta === '/reservas') return [200,{reservas:reservaFormulario?[{...reservaFormulario,
          accionesDisponibles:reservaFormulario.accionesDisponibles.filter(a=>a!=='CANCELAR'||current.permisos.includes('reservas.cancelar'))}]:[]}];
        if (method === 'PUT' && ruta === '/reservas/9005') {
          cambiosReservas.push({method,ruta,body,rol:current.rol});
          if (falloEdicionReserva) return [falloEdicionReserva==='conflicto'?409:500,{codigo:falloEdicionReserva==='conflicto'?'RESERVA_CONFLICTO':'OPERACION_RESULTADO_INCIERTO',mensaje:falloEdicionReserva==='conflicto'?'La reserva cambió. Recargá los datos.':'No se pudo confirmar el resultado del guardado. Recargá los datos antes de reintentar.'}];
          if(body.versionEdicion!==reservaFormulario.versionEdicion)return [409,{codigo:'RESERVA_CONFLICTO_CONCURRENCIA',mensaje:'La reserva cambió. Recargá los datos.'}];
          reservaFormulario={...reservaFormulario,...body,versionEdicion:'b'.repeat(64)}; return [200,{reserva:reservaFormulario}];
        }
        if (method === 'PATCH' && ruta === '/reservas/9005/cancelar') {
          if(current.rol!=='Administrador')return [403,{mensaje:'Sin permiso de cancelación.'}];
          cambiosReservas.push({method,ruta,body,rol:current.rol});
          if(falloCancelacionReserva)return [500,{codigo:'OPERACION_RESULTADO_INCIERTO',mensaje:'No se pudo confirmar el resultado del guardado. Recargá los datos antes de reintentar.'}];
          if(body.versionEdicion!==reservaFormulario.versionEdicion)return [409,{codigo:'RESERVA_CONFLICTO_CONCURRENCIA',mensaje:'La reserva cambió. Recargá los datos.'}];
          reservaFormulario={...reservaFormulario,versionEdicion:'c'.repeat(64),estado:'Cancelada',accionesDisponibles:['VER']}; return [200,{reserva:reservaFormulario}];
        }
      }
      if(ruta.startsWith('/notificaciones/')) {
        if(sinNotificaciones)return [403,{mensaje:'Sin permiso.'}];
        if(ruta==='/notificaciones/avisos'){
          if(modoAvisos==='error')return [503,{mensaje:'Fallo ficticio de consulta.'}];
          if(modoAvisos==='incompleto')return [200,{avisos:[]}];
          const categoria=params.get('categoria')||'todas',prioridad=params.get('prioridad')||'todas',pagina=Number(params.get('pagina')||1),limite=Number(params.get('limite')||20);
          const todas=modoAvisos==='vacio'?[]:Array.from({length:modoAvisos==='uno'?1:modoAvisos==='prioridades'?5:42},(_,i)=>({idAviso:i+1,tipo:i%2?'INCIDENCIA_ABIERTA':'CHECKIN_PROXIMO',categoria:i%2?'alertas':'reservas',titulo:`Aviso ficticio ${i+1}`,descripcion:'Información operativa ficticia, sin datos privados.',prioridad:modoAvisos==='uno'?'Critica':modoAvisos==='prioridades'?['Critica','Alta','Media','Informativa','NoDefinida'][i]:i%3===0?'Alta':'Media',fecha:modoAvisos==='uno'?'2026-09-27T05:10:00.000Z':i===0?null:'2026-10-15T13:00:00.000Z',destino:{seccion:'alertas'},datosEconomicos:{monto:999999}}));
          const lista=todas.filter(a=>(categoria==='todas'||a.categoria===categoria)&&(prioridad==='todas'||a.prioridad===prioridad));
          return [200,{avisos:lista.slice((pagina-1)*limite,pagina*limite),paginacion:{total:lista.length,totalSinFiltros:todas.length,paginas:Math.max(1,Math.ceil(lista.length/limite)),pagina,limite},origen:'alertas_persistidas',lecturaPersonal:false}];
        }
        if(modoPreferencias==='pendiente')return [503,{codigo:'NOTIFICACIONES_NO_ACTIVADAS',mensaje:'Las preferencias todavía no están activadas.'}];
        if(modoPreferencias==='modelo')return [503,{codigo:'NOTIFICACIONES_MODELO_PENDIENTE',mensaje:'Modelo pendiente.'}];
        if(modoPreferencias==='prohibida')return [403,{mensaje:'Sin permiso.'}];
        if(modoPreferencias==='error')return [503,{mensaje:'Consulta ficticia no disponible.'}];
        const lista=preferenciasPorUsuario.get(current.idUsuario)||Object.keys(TIPOS_NOTIFICACION).map(tipo=>({tipo,habilitada:false,versionRegistro:null,persistida:false}));
        if(method==='PUT'){
          if(modoPreferencias==='lectura')return [503,{codigo:'NOTIFICACIONES_SOLO_LECTURA',mensaje:'Guardado no habilitado.'}];
          if(modoPreferencias==='sin-confirmacion')return [200,{preferencias:lista.map(p=>({...p,persistida:false,versionRegistro:null})),estado:{persistencia:'sql',soloLectura:false}}];
          if(conflictoPreferencias||body.preferencias.some(p=>lista.find(x=>x.tipo===p.tipo).versionRegistro!==p.versionRegistro))return [409,{codigo:'NOTIFICACIONES_CONFLICTO',mensaje:'Conflicto ficticio.'}];
          const saved=body.preferencias.map(p=>({...p,persistida:true,versionRegistro:(++revisionPreferencias).toString(16).padStart(16,'0')}));preferenciasPorUsuario.set(current.idUsuario,saved);
          return [200,{preferencias:saved,estado:{persistencia:'sql',soloLectura:false}}];
        }
        return [200,{preferencias:lista,estado:{persistencia:'sql',soloLectura:modoPreferencias==='lectura'}}];
      }
      if(ruta.startsWith('/configuracion/')) {
        if(obligatorio)return [403,{codigo:'PASSWORD_CHANGE_REQUIRED',mensaje:'Debe cambiar su contraseña para continuar.'}];
        if(!configuracionActivada)return [503,{codigo:'CONFIGURACION_PENDIENTE',mensaje:'La persistencia empresarial todavía no está activada.'}];
        if(ruta==='/configuracion/predeterminados-reserva')return [200,{predeterminados:{horaIngreso:predeterminadosInvalidos?'24:00':operativasConfiguracion.horaIngreso,horaEgreso:operativasConfiguracion.horaEgreso,zonaHoraria:operativasConfiguracion.zonaHoraria}}];
        if(current.rol!=='Administrador')return [403,{mensaje:'Sin permiso.'}];
        if(method==='GET' && falloCargaConfiguracion)return [503,{mensaje:'Carga temporalmente no disponible.'}];
        const empresa=ruta.endsWith('/empresa'), actual=empresa?empresaConfiguracion:operativasConfiguracion, key=empresa?'empresa':'preferencias';
        if(method==='PUT') {
          if(soloLecturaConfiguracion)return [503,{codigo:'CONFIGURACION_SOLO_LECTURA',mensaje:'La configuración empresarial está en modo de solo lectura.'}];
          if(falloGuardarConfiguracion)return [503,{mensaje:'Error temporal de persistencia.'}];
          if(conflictoConfiguracion||body.versionRegistro!==actual.versionRegistro)return [409,{codigo:'CONFIGURACION_CONFLICTO',mensaje:'Otra sesión cambió la configuración. Recargá los datos.'}];
          if(respuestaConfiguracionIncompleta)return [200,{[key]:{nombreComercial:'Respuesta incompleta'}}];
          const saved={...actual,...body,versionRegistro:(++revisionConfiguracion).toString(16).padStart(16,'0')};
          if(empresa)empresaConfiguracion=saved;else operativasConfiguracion=saved;
          return [200,{[key]:saved}];
        }
        return [200,{[key]:actual,...(estadoConfiguracionAusente?{}:{estado:{persistencia:'sql',soloLectura:soloLecturaConfiguracion}})}];
      }
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
      if (ruta === "/dashboard/reportes") return [200, { reportes: datosVisuales ? reportesVisuales : { periodo: { fechaDesde: "2026-10-01", fechaHasta: "2026-10-31", tipo: "mensual" }, filtros: {}, resumen: { totalReservasPeriodo: 0, totalReservasOperativas: 0, reservasConIngreso: 0, ingresosEstimados: 0, nochesOcupadas: 0, nochesDisponibles: 0, ocupacionPromedio: 0 }, historico: [], porCanal: [], porEstado: [], porPropiedad: [] } }];
      if (ruta === "/calendario") return [200, datosVisuales ? calendarioVisual : { anio: 2026, mes: 10, diasMes: 31, propiedades: [], resumen: { reservas: 0 } }];
      if (ruta === "/recomendaciones") return falloFlowIA ? [503, { mensaje: 'Análisis ficticio no disponible' }] : [200, modoFlowIA === 'incompleto' ? { recomendaciones: {} } : { recomendaciones: datosVisuales ? [{ ...recomendacionVisual, ...(destinoFlowIA ? { destino: destinoFlowIA } : {}) }] : [], resumen: { total: datosVisuales ? 1 : 0 }, contexto: {} }];
      const detalleReserva = /^\/reservas\/(\d+)\/(eventos|mensajes|incidencias|observaciones)$/.exec(ruta);
      if (method === 'GET' && detalleReserva) {
        const [,id,campo] = detalleReserva;
        return [200, { [campo]: detalleReservaIncompleto ? {} : campo === 'eventos' ? [{idEventoReserva:Number(id),tipo:'RESERVA_CREADA',titulo:`Evento ficticio reserva ${id}`,descripcion:'Historial aislado',origen:'Manual',fechaEvento:'2028-02-28T12:00:00.000Z',datosJson:{}}] : [] }];
      }
      if (method === 'GET' && ruta === '/reservas' && dosReservas) return [200, {reservas:[reservaVisual,{...reservaVisual,idReserva:2,huesped:'Segunda persona ficticia'}]}];
      if (method === 'POST' && ruta === '/reservas') {
        altasReservas.push({rol:current.rol,body});
        const campos=['idPropiedad','idHuesped','fechaIngreso','horaIngreso','fechaEgreso','horaEgreso','cantidadHuespedes','montoEstimado'];
        if(current.rol==='Operador' && Object.keys(body).some(k=>!campos.includes(k))) return [403,{mensaje:'Campo de alta no autorizado.'}];
        if(falloAltaReserva)return [500,{codigo:'OPERACION_RESULTADO_INCIERTO',mensaje:'No se pudo confirmar el resultado del guardado. Recargá los datos antes de reintentar.'}];
        if(formularioRealPrueba) {
          if(body.idPropiedad!==5 || body.idHuesped!==17) return [400,{mensaje:'Elegí los fixtures ficticios correctos.'}];
          reservaFormulario={...reservaVisual,...body,idReserva:9005,propiedad:'HF-PILOTO-FICTICIO',huesped:'Prueba HF-PILOTO-FICTICIO',accionesDisponibles:['VER','EDITAR','CANCELAR']};
          return [201,{reserva:reservaFormulario}];
        }
        return [201,{mensaje:'Reserva creada correctamente.',reserva:{...reservaVisual,...body,idReserva:1000+altasReservas.length,canal:'Manual'}}];
      }
      if (falloMantenimiento && method === 'POST' && ['/reservas/finalizar-vencidas','/limpiezas/sincronizar','/alertas/sincronizar'].includes(ruta)) return [503, { mensaje: 'Resultado ficticio incierto. Recargá antes de reintentar.' }];
      if (method === 'POST' && ruta === '/reservas/finalizar-vencidas') return [200, { resultado: { cantidadFinalizadas: 0, idsReservas: [] } }];
      if (method === 'POST' && ['/limpiezas/sincronizar','/alertas/sincronizar'].includes(ruta)) return [200, { resultado: { creadas: 0, actualizadas: 0 } }];
      const modulo = ruta.split("/")[1];
      if(method==='GET' && /^\/huespedes\/\d+$/.test(ruta)) {
        if(modoDetalleHuesped==='inexistente')return [404,{mensaje:'El huésped no existe.'}];
        if(modoDetalleHuesped==='error')return [503,{mensaje:'Error temporal simulado.'}];
        const id=Number(ruta.split('/')[2]);
        return [200,{huesped:{...huespedVisual,idHuesped:id,dni:'Documento ficticio',nacionalidad:'Argentina',
          historialReservas:modoDetalleHuesped==='vacio'?[]:Array.from({length:12},(_,i)=>({...reservaVisual,idReserva:i+1,montoEstimado:120000}))}}];
      }
      if (["propiedades", "reservas", "huespedes", "alertas", "limpiezas"].includes(modulo)) {
        const fixtures = { propiedades: propiedadVisual, reservas: reservaVisual, huespedes: huespedVisual, alertas: alertaVisual, limpiezas: limpiezaVisual };
        if(modulo==='huespedes'&&listaHuespedesLarga)return [200,{huespedes:Array.from({length:24},(_,i)=>({...huespedVisual,idHuesped:i+1}))}];
        return [200, { [modulo]: datosVisuales ? [fixtures[modulo]] : [], resumen: { total: datosVisuales ? 1 : 0, pendientes: datosVisuales ? 1 : 0, enProgreso: 0, completadas: 0, canceladas: 0, urgentes: 0 } }];
      }
      return [404, { mensaje: "Ruta no prevista en la API aislada" }];
    }

    cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      const description = exceptionDetails.exception?.description || "";
      excepciones.push({ fase, tipo: /^(\w+Error)/.exec(description)?.[1] || "Error", campo: /reading '(\w+)'/.exec(description)?.[1] });
    });
    cdp.on("Page.javascriptDialogOpening", ({ type }) => {
      dialogosNativos.push(type);
      send("Page.handleJavaScriptDialog", { accept: aceptarDialogo }).catch(() => excepciones.push("dialogo"));
    });
    cdp.on('Network.loadingFailed', ({ requestId, canceled }) => { if(canceled) solicitudesAbortadas.add(requestId); });
    cdp.on("Fetch.requestPaused", async ({ requestId, request, networkId }) => {
      let etapa='origen';
      try {
        const url = new URL(request.url);
        if (url.origin === base) { modulosCliente.push(url.pathname);await send("Fetch.continueRequest", { requestId }); return; }
        if (url.hostname !== "127.0.0.1" || !url.pathname.startsWith("/api/")) {
          await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }); return;
        }
        const ruta = url.pathname.slice(4);
        // Solo payloads ficticios de negocio de la jornada. Nunca auth/contraseñas/tokens.
        const cuerpoJornada=(jornada.esActiva()||apiUniversitaria)&&/^\/(monedas|reservas|propiedades|huespedes)(\/|$)/.test(ruta)&&request.postData?JSON.parse(request.postData):undefined;
        requests.push({ method: request.method, ruta, params: Object.fromEntries(url.searchParams),...(cuerpoJornada?{body:cuerpoJornada}:{}) });
        if(formularioRealPrueba && request.method==='GET' && ['/propiedades','/huespedes'].includes(ruta) && demoraCatalogosReserva) await new Promise(r=>setTimeout(r,demoraCatalogosReserva));
        if(ruta==='/configuracion/predeterminados-reserva' && falloRedPredeterminados) {
          await send('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'});return;
        }
        if(ruta==='/configuracion/predeterminados-reserva' && request.method==='GET' && demoraPredeterminados) await new Promise(r=>setTimeout(r,demoraPredeterminados));
        if(/^\/huespedes\/\d+$/.test(ruta) && demoraDetalleHuesped) await new Promise(r=>setTimeout(r,demoraDetalleHuesped));
        if(ruta==='/recomendaciones' && demoraFlowIA) await new Promise(r=>setTimeout(r,demoraFlowIA));
        if(/^\/reservas\/1\/(eventos|mensajes|incidencias|observaciones)$/.test(ruta) && demoraReservaAnterior) await new Promise(r=>setTimeout(r,demoraReservaAnterior));
        if(ruta==='/notificaciones/avisos'&&demoraAvisos)await new Promise(r=>setTimeout(r,demoraAvisos));
        if(ruta==='/notificaciones/preferencias'&&request.method==='PUT'&&demoraPreferencias)await new Promise(r=>setTimeout(r,demoraPreferencias));
        if(solicitudesAbortadas.has(networkId)) return;
        if(ruta.startsWith('/configuracion/') && request.method==='PUT' && demoraGuardarConfiguracion) await new Promise(r=>setTimeout(r,demoraGuardarConfiguracion));
        etapa='fixture';
        const [status, data] = request.method === "OPTIONS" ? [204, {}] : await api(request.method, ruta, request.postData ? JSON.parse(request.postData) : {}, url.searchParams);
        etapa='entrega';
        await send("Fetch.fulfillRequest", { requestId, responseCode: status,
          responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: base },
            { name: "Access-Control-Allow-Headers", value: "authorization,content-type" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,OPTIONS" }],
          body: Buffer.from(status === 204 ? "" : JSON.stringify(data)).toString("base64") });
      } catch(error) { if(!solicitudesAbortadas.has(networkId)) excepciones.push({tipo:'API aislada',fase,etapa,ruta:new URL(request.url).pathname,clase:error.name}); }
    });
    await send("Runtime.enable"); await send("Page.enable"); await send('Network.enable'); await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
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
      await new Promise(r=>setTimeout(r,220)); // Esperar transiciones para revisar colores finales.
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
      await esperar(`Boolean(document.body) && !document.body.dataset.beforeReload && (${inicioVisible})`);
    };

    const comprobarUtilidades = async (rol) => {
      if (await evaluate("document.querySelector('.sidebar').classList.contains('sidebar--collapsed')")) await click('.sidebar-collapse-toggle');
      const principal = ['Inicio','Propiedades','Reservas','Huéspedes','Calendario','Limpiezas','Reportes','Alertas','Notificaciones', ...(rol === 'Administrador' ? ['Usuarios'] : []), 'FlowIA'];
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.sidebar-nav button')].map(b=>b.textContent.trim())"), principal);
      assert.deepEqual(await evaluate("[...document.querySelector('.sidebar-footer').children].map(e=>e.classList.contains('sidebar-settings')?'configuracion':e.className)"), ['configuracion','sidebar-user','sidebar-logout']);
      assert.equal(await evaluate("document.querySelectorAll('.sidebar-settings').length"), 1);
      assert.equal(await evaluate("document.querySelector('.sidebar-settings').getAttribute('aria-label')"), 'Configuración');
      assert.equal(await evaluate("document.querySelector('.sidebar-settings').title"), 'Configuración');
      for (const width of [1280,820]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:420,deviceScaleFactor:1,mobile:false});
        for (const selector of ['.sidebar-nav button:last-child','.sidebar-settings','.sidebar-user','.sidebar-logout']) {
          await evaluate(`document.querySelector('${selector}').focus()`);
          assert.equal(await evaluate(`(() => {const e=document.querySelector('${selector}'), r=e.getBoundingClientRect();return document.activeElement===e && r.top>=0 && r.bottom<=innerHeight;})()`), true, `${selector} accesible a ${width}x420.`);
        }
        assert.equal(await evaluate("document.querySelector('.sidebar-footer').getBoundingClientRect().top>=document.querySelector('.sidebar-nav').getBoundingClientRect().bottom"), true, 'Las utilidades no se superponen a la navegación.');
      }
      await click('.sidebar-collapse-toggle');
      assert.equal(await evaluate("document.querySelector('.sidebar').classList.contains('sidebar--collapsed')"), true);
      await evaluate("document.querySelector('.sidebar-settings').focus()");
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await esperar("Boolean(document.querySelector('.theme-options'))");
      assert.equal(await evaluate("document.querySelector('.sidebar-settings').getAttribute('aria-current')"), 'page');
      await capturar(`utilidades-colapsadas-${rol.toLowerCase()}`);
      await click('.sidebar-collapse-toggle');
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:420,deviceScaleFactor:1,mobile:true});
      await click('.mobile-menu-toggle'); await esperar("Boolean(document.querySelector('.mobile-nav-settings'))");
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.mobile-nav-list button')].map(b=>b.textContent.trim())"), principal);
      assert.deepEqual(await evaluate("[...document.querySelector('.mobile-nav-footer').children].map(e=>e.classList.contains('mobile-nav-settings')?'configuracion':e.className)"), ['configuracion','mobile-nav-user','mobile-nav-logout']);
      assert.equal(await evaluate("document.querySelectorAll('.mobile-nav-settings').length"), 1);
      assert.equal(await evaluate("document.querySelector('.mobile-nav-settings').getAttribute('aria-current')"), 'page');
      for(const selector of ['.mobile-nav-settings','.mobile-nav-user','.mobile-nav-logout']) {
        await evaluate(`document.querySelector('${selector}').focus()`);
        assert.equal(await evaluate(`(() => {const e=document.querySelector('${selector}'), r=e.getBoundingClientRect(), p=e.closest('.mobile-nav-drawer').getBoundingClientRect();return document.activeElement===e && r.top>=p.top && r.bottom<=innerHeight;})()`), true, `${selector} accesible en menú móvil corto.`);
        assert.equal(await evaluate(`(() => {const e=document.querySelector('${selector}'), r=e.getBoundingClientRect();return [.1,.5,.9].every(x=>e.contains(document.elementFromPoint(r.left+r.width*x,r.top+r.height/2)));})()`), true, `${selector} libre de superposiciones.`);
      }
      await capturar(`utilidades-movil-${rol.toLowerCase()}`);
      await click('.mobile-nav-user'); await esperar("Boolean(document.querySelector('#cuenta-nombre')) && !document.querySelector('.mobile-nav-settings')");
      await click('.mobile-menu-toggle'); await esperar("Boolean(document.querySelector('.mobile-nav-settings'))");
      await click('.mobile-nav-settings'); await esperar("Boolean(document.querySelector('.theme-options')) && !document.querySelector('.mobile-nav-settings')");
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate("document.querySelectorAll('.sidebar-nav button.active').length"), 0);
      assert.equal(await evaluate("document.querySelectorAll('.sidebar-footer button.active').length"), 1);
    };

    if (process.env.HOSTFLOW_TEST_PRIORITY_ONLY !== '1'&&!soloJornada&&!soloNocturno&&!soloPulido) {
    await t.test("Administrador inicia en Inicio y recarga sin sincronizar otros módulos", async () => {
      fase = "inicio Admin"; await login(); await esperar(inicioVisible);
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"),true);
      assert.equal(await evaluate("document.querySelector('.main').textContent.includes('Ingresos del mes')"),true);
      const previas = requests.length;
      await recargarInicio();
      assert.ok(requests.slice(previas).every(r=>['/auth/me','/dashboard/resumen','/dashboard/historico','/monedas/estado'].includes(r.ruta) && ['GET','OPTIONS'].includes(r.method)));
      await click('.sidebar-logout'); await esperar("Boolean(document.querySelector('#login-email'))");
    });

    await t.test("Configuración: temas reales, persistencia, sistema, responsive y logout", async () => {
      fase = "temas Admin"; await login(); await esperar(inicioVisible);
      await comprobarUtilidades('Administrador');
      await esperar("Boolean(document.querySelector('.theme-options'))");
      assert.equal(await evaluate("document.querySelector('.sidebar-settings').getAttribute('aria-current')"),'page');
      assert.equal(await evaluate("document.documentElement.dataset.theme"),"light");
      assert.equal(await evaluate("document.querySelectorAll('.settings-nav button').length"),8);
      await capturar('configuracion-clara');
      const anteriores = requests.length, tokenPrevio = await evaluate("localStorage.getItem('token')");
      await click('input[name=apariencia][value=oscuro]');
      await esperar("document.documentElement.dataset.theme==='dark'");
      assert.equal(await evaluate("localStorage.getItem('hostflow.apariencia.v1')"),'oscuro');
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.settings-card')).backgroundColor"),'rgb(25, 35, 54)');
      assert.equal(await evaluate("localStorage.getItem('token')"),tokenPrevio);
      assert.equal(requests.length,anteriores,"Cambiar apariencia no consulta ni escribe en la API.");
      await capturar('configuracion-oscura');
      await evaluate("document.querySelector('input[value=oscuro]').focus()");
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
      await esperar("document.querySelector('input[value=automatico]').checked");
      await click('input[name=apariencia][value=oscuro]');
      await recargarInicio();
      assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
      await click('.sidebar-settings');
      await esperar("document.querySelector('input[value=oscuro]')?.checked");
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
      await click('input[name=apariencia][value=automatico]');
      await esperar("document.documentElement.dataset.theme==='dark'");
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
      await esperar("document.documentElement.dataset.theme==='light'");
      assert.equal(await evaluate("localStorage.getItem('hostflow.apariencia.v1')"),'automatico');
      await click('input[name=apariencia][value=claro]');
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
      assert.equal(await evaluate("document.documentElement.dataset.theme"),'light');
      await click('input[name=apariencia][value=oscuro]');
      for(const width of [320,390,820]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
        assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true,`Configuración sin desborde a ${width}px.`);
        if(width===390) await capturar('configuracion-oscura-movil');
      }
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes('Datos de empresa')).click()");
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      assert.equal(await evaluate("document.querySelector('#config-nombreComercial').value"),'Alojamientos ficticios');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes('Seguridad y acceso')).click()");
      assert.equal(await evaluate("document.querySelector('.settings-links').textContent.includes('Gestionar usuarios')"),true);
      await click('.sidebar-logout'); await esperar("Boolean(document.querySelector('#login-email'))");
      assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
      assert.equal(await evaluate("localStorage.getItem('hostflow.apariencia.v1')"),'oscuro');
      await capturar('login-oscuro');
    });

    await t.test('Datos de empresa y operativas: guardar real aislado, errores, conflictos, temas y activación pendiente',async()=>{
      fase='configuración empresarial';await login();await esperar(inicioVisible);await click('.sidebar-settings');
      const seccion=async label=>evaluate(`[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent.includes(${JSON.stringify(label)})).click()`);
      const submit=()=>evaluate("document.querySelector('.settings-editor form').requestSubmit()");
      const confirmar=()=>evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar guardado').click()");
      const cancelar=()=>evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Cancelar').click()");
      const puts=()=>requests.filter(r=>r.method==='PUT'&&r.ruta.startsWith('/configuracion/')).length;
      await seccion('Datos de empresa');await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      const previos=puts();
      await fill('#config-nombreComercial',' ');await submit();await esperar("document.querySelector('#config-nombreComercial').getAttribute('aria-invalid')==='true'");assert.equal(puts(),previos);
      await fill('#config-nombreComercial','Alojamientos editados');await fill('#config-correoContacto','correo incorrecto');await submit();assert.equal(puts(),previos);
      await fill('#config-correoContacto','nuevo@example.invalid');await fill('#config-informacionAdicional','Información ficticia\nSegunda línea');
      await submit();await esperar("Boolean(document.querySelector('dialog'))");await cancelar();assert.equal(puts(),previos);
      falloGuardarConfiguracion=true;await submit();await esperar("Boolean(document.querySelector('dialog'))");await confirmar();await esperar("document.querySelector('.settings-editor [role=alert]')?.textContent.includes('Error temporal')");
      assert.equal(await evaluate("document.querySelector('#config-nombreComercial').value"),'Alojamientos editados');assert.equal(await evaluate("document.querySelector('.settings-editor').textContent.includes('Cambios guardados correctamente')"),false);
      falloGuardarConfiguracion=false;await submit();await esperar("Boolean(document.querySelector('dialog'))");await confirmar();await esperar("document.querySelector('.settings-editor').textContent.includes('Cambios guardados correctamente')");
      assert.equal(empresaConfiguracion.nombreComercial,'Alojamientos editados');
      await capturar('datos-empresa-oscuro');
      conflictoConfiguracion=true;await fill('#config-direccion','Dirección del borrador');await submit();await esperar("Boolean(document.querySelector('dialog'))");await confirmar();await esperar("document.querySelector('.settings-editor').textContent.includes('Tu borrador se conserva')");
      assert.equal(await evaluate("document.querySelector('#config-direccion').value"),'Dirección del borrador');assert.equal(await evaluate("document.querySelector('.settings-editor button[type=submit]').disabled"),true);
      await evaluate("[...document.querySelectorAll('.settings-editor button')].find(b=>b.textContent==='Recargar datos').click()");await esperar("Boolean(document.querySelector('dialog'))");await cancelar();assert.equal(await evaluate("document.querySelector('#config-direccion').value"),'Dirección del borrador');
      conflictoConfiguracion=false;
      await evaluate("[...document.querySelectorAll('.settings-editor button')].find(b=>b.textContent==='Recargar datos').click()");await esperar("Boolean(document.querySelector('dialog'))");
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Descartar cambios').click()");await esperar("document.querySelector('#config-direccion')?.value===''");
      await seccion('Preferencias operativas');await esperar("Boolean(document.querySelector('#config-horaIngreso'))");
      await fill('#config-horaIngreso','18:15');await fill('#config-horaEgreso','08:45');
      await seccion('Apariencia');await esperar("Boolean(document.querySelector('dialog'))");
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Seguir editando').click()");assert.equal(await evaluate("document.querySelector('#config-horaIngreso').value"),'18:15');
      await submit();await esperar("Boolean(document.querySelector('dialog'))");await confirmar();await esperar("document.querySelector('.settings-editor').textContent.includes('Cambios guardados correctamente')");
      assert.equal(operativasConfiguracion.horaIngreso,'18:15');assert.equal(operativasConfiguracion.horaEgreso,'08:45');
      assert.equal(await evaluate("document.querySelectorAll('input[name=zonaHoraria],select[name=zonaHoraria]').length"),0);
      for(const modo of ['claro','oscuro','automatico']) {
        await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await evaluate(`globalThis.HostFlowAppearance.setPreference('${modo}')`);
        await fill('#config-horaIngreso','18:16');await submit();await esperar("Boolean(document.querySelector('dialog'))");
        assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog')).backgroundColor===getComputedStyle(document.querySelector('.settings-editor')).backgroundColor"),true,`${modo}: diálogo con la superficie del tema.`);
        await cancelar();await fill('#config-horaIngreso','18:15');
        for(const width of [1280,820,390,320]) {
          await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
          assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true,`${modo}: formulario sin desborde a ${width}px.`);
          if(width===390)await capturar(`preferencias-${modo}-movil`);
        }
      }
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
      configuracionActivada=false;await seccion('Datos de empresa');await esperar("document.querySelector('.settings-activation')?.textContent.includes('Pendiente de activar persistencia')");
      assert.equal(await evaluate("Boolean(document.querySelector('.settings-editor form'))"),false);assert.equal(await evaluate("document.querySelector('.settings-editor').textContent.includes('Guardar cambios')"),false);
      configuracionActivada=true;await click('.settings-activation button');await esperar("document.querySelector('#config-nombreComercial')?.value==='Alojamientos editados'");
      await click('.sidebar-logout');await esperar("Boolean(document.querySelector('#login-email'))");
    });

    await t.test('Borradores: navegación principal, perfil, subsecciones, sidebar colapsada, móvil y logout', async () => {
      fase = 'borradores protegidos'; await login(); await esperar(inicioVisible); await click('.sidebar-settings');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Datos de empresa').click()");
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      await fill('#config-nombreComercial', 'Borrador que debe conservarse');
      await fill('#config-correoContacto', 'correo inválido');
      await evaluate("document.querySelector('.settings-editor form').requestSubmit()");
      const snapshot = () => evaluate("JSON.stringify([...document.querySelectorAll('.settings-editor input,.settings-editor textarea')].map(i=>[i.name,i.value,i.getAttribute('aria-invalid')]))");
      const antes = await snapshot();
      const cancelarSalida = async () => {
        await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
        await evaluate("[...document.querySelectorAll('.settings-guard button')].find(b=>b.textContent==='Seguir editando').click()");
        assert.equal(await snapshot(), antes);
        assert.equal(await evaluate("document.querySelector('#config-correoContacto').getAttribute('aria-invalid')"), 'true');
      };
      const peticiones = requests.length;
      for (const label of ['Inicio', 'Propiedades', 'Reservas', 'Usuarios']) {
        await evaluate(`[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
        await cancelarSalida();
      }
      await click('.sidebar-user'); await cancelarSalida();
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Preferencias operativas').click()");
      await cancelarSalida();
      await click('.sidebar-settings');
      assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"), false, 'Configuración activa conserva su apartado sin reiniciarlo.');
      assert.equal(await snapshot(), antes);
      assert.equal(requests.length, peticiones, 'Cancelar no consulta ni monta otros módulos.');
      for(const modo of ['claro','oscuro','automatico']) {
        await evaluate(`globalThis.HostFlowAppearance.setPreference('${modo}')`);
        await click('.sidebar-user');await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.settings-guard dialog')).backgroundColor===getComputedStyle(document.querySelector('.settings-editor')).backgroundColor"),true,`${modo}: aviso de salida tematizado.`);
        for(const width of [1280,820,390,320]) {
          await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
          assert.equal(await evaluate("(()=>{const d=document.querySelector('.settings-guard dialog');return d.scrollWidth<=d.clientWidth && d.getBoundingClientRect().width<=innerWidth})()"),true,`${modo}: aviso sin desbordes a ${width}px.`);
          if(width===390)await capturar(`borrador-${modo}-movil`);
        }
        await cancelarSalida();
      }
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
      await evaluate("document.querySelector('.sidebar-user').focus()");
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await esperar("!document.querySelector('dialog[open]')");
      assert.equal(await evaluate("document.activeElement===document.querySelector('.sidebar-user')"),true,'Escape devuelve el foco al perfil.');
      assert.equal(await snapshot(),antes);
      await click('.sidebar-collapse-toggle');
      await click('.sidebar-user'); await cancelarSalida();
      await click('.sidebar-settings'); assert.equal(await snapshot(), antes);
      await click('.sidebar-collapse-toggle');
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await click('.mobile-menu-toggle');
      await click('.mobile-nav-user'); await cancelarSalida();
      assert.equal(await evaluate("Boolean(document.querySelector('.mobile-nav-user'))"), true, 'Cancelar mantiene el menú móvil.');
      await click('.mobile-nav-settings'); assert.equal(await snapshot(), antes);
      await click('.mobile-menu-toggle');
      await click('.mobile-nav-logout'); await cancelarSalida();
      await click('.mobile-menu-toggle');
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      const logoutPrevios = requests.filter(r=>r.ruta==='/auth/logout').length;
      await click('.sidebar-logout'); await cancelarSalida();
      assert.equal(requests.filter(r=>r.ruta==='/auth/logout').length, logoutPrevios);
      await click('.sidebar-user'); await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
      await evaluate("[...document.querySelectorAll('.settings-guard button')].find(b=>b.textContent==='Descartar y continuar').click()");
      await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      await click('.sidebar-settings');
      assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"), false, 'El formulario desmontado no deja una protección residual.');
      await click('.sidebar-logout'); await esperar("Boolean(document.querySelector('#login-email'))");
    });

    await t.test('Borradores: recargar/cerrar pestaña advierte; cancelar conserva y aceptar recarga descarta', async () => {
      fase = 'recarga protegida'; await login(); await esperar(inicioVisible); await click('.sidebar-settings');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Datos de empresa').click()");
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      await evaluate("document.querySelector('#config-nombreComercial').focus()");
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'x', code: 'KeyX', windowsVirtualKeyCode: 88, text: 'x' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'x', code: 'KeyX', windowsVirtualKeyCode: 88 });
      await fill('#config-nombreComercial', 'Borrador privado ficticio');
      const valor = await evaluate("document.querySelector('#config-nombreComercial').value");
      assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()"), true);
      assert.equal(await evaluate("Object.values(localStorage).some(v=>v.includes('Borrador privado ficticio'))"), false, 'El borrador no se persiste.');
      aceptarDialogo = false;
      let previos = dialogosNativos.length;
      await send('Page.reload');
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      assert.equal(dialogosNativos.slice(previos).includes('beforeunload'), true);
      assert.equal(await evaluate("document.querySelector('#config-nombreComercial').value"), valor);
      previos = dialogosNativos.length;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
      await send('Page.close');
      for (let n=0;n<50 && dialogosNativos.length===previos;n++) await new Promise(r=>setTimeout(r,20));
      assert.equal(dialogosNativos.slice(previos).includes('beforeunload'), true);
      assert.equal(await evaluate("document.querySelector('#config-nombreComercial').value"), valor);
      aceptarDialogo = true; await send('Page.reload'); await esperar(inicioVisible);
      assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()"), false);
      await click('.sidebar-logout'); await esperar("Boolean(document.querySelector('#login-email'))");
    });

    await t.test('Borradores: una revocación 401 cierra la sesión incluso con confirmación abierta', async () => {
      fase = 'revocación con borrador'; await login(); await esperar(inicioVisible); await click('.sidebar-settings');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Datos de empresa').click()");
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      await fill('#config-nombreComercial', 'Borrador revocado'); await click('.sidebar-user');
      await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
      caducada = true;
      await evaluate("import('/src/services/api.js').then(m=>m.default.get('/auth/me').catch(()=>{}))");
      await esperar("Boolean(document.querySelector('#login-email'))");
      assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"), false);
      assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()"), false);
      assert.equal(await evaluate("localStorage.getItem('token')"), null);
    });

    await t.test('Borradores: el cambio obligatorio informado por 403 prevalece sobre la navegación pendiente',async()=>{
      fase='cambio obligatorio con borrador';await login();await esperar(inicioVisible);await click('.sidebar-settings');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Datos de empresa').click()");
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");await fill('#config-nombreComercial','Borrador que no bloquea seguridad');
      await click('.sidebar-user');await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
      obligatorio=true;
      await evaluate("import('/src/services/api.js').then(m=>m.default.get('/configuracion/empresa').catch(()=>{}))");
      await esperar("Boolean(document.querySelector('#cuenta-actual')) && !document.querySelector('.sidebar')");
      assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"),false);
      assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()"),false);
      await click('.security-page--required header button');await esperar("Boolean(document.querySelector('#login-email'))");obligatorio=false;
    });

    await t.test('Borradores: el vencimiento automático de la sesión no espera confirmaciones',async()=>{
      fase='vencimiento con borrador';caducaEn=Math.floor(Date.now()/1000)+3;
      await login();await esperar(inicioVisible);await click('.sidebar-settings');
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Datos de empresa').click()");
      await esperar("Boolean(document.querySelector('#config-nombreComercial'))");await fill('#config-nombreComercial','Borrador vencido');
      await click('.sidebar-user');await esperar("Boolean(document.querySelector('.settings-guard dialog[open]'))");
      await esperar("Boolean(document.querySelector('#login-email'))");caducaEn=null;
      assert.equal(await evaluate("localStorage.getItem('token')"),null);
      assert.equal(await evaluate("Boolean(document.querySelector('dialog[open]'))"),false);
    });

    await t.test('Configuración: carga fallida, respuesta incompleta, bloqueo durante guardado y un solo envío',async()=>{
      fase='confirmación de persistencia';await login();await esperar(inicioVisible);await click('.sidebar-settings');
      falloCargaConfiguracion=true;
      await evaluate("[...document.querySelectorAll('.settings-nav button')].find(b=>b.textContent==='Datos de empresa').click()");
      await esperar("document.querySelector('.settings-activation')?.textContent.includes('Carga temporalmente')");
      assert.equal(await evaluate("Boolean(document.querySelector('.settings-editor form'))"),false);
      falloCargaConfiguracion=false;await click('.settings-activation button');await esperar("Boolean(document.querySelector('#config-nombreComercial'))");
      await fill('#config-nombreComercial','Nombre con confirmación controlada');
      respuestaConfiguracionIncompleta=true;
      await evaluate("document.querySelector('.settings-editor form').requestSubmit()");await esperar("Boolean(document.querySelector('dialog[open]'))");
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar guardado').click()");
      await esperar("document.querySelector('.settings-editor [role=alert]')?.textContent.includes('No recibimos una confirmación válida')");
      assert.equal(await evaluate("document.querySelector('#config-nombreComercial').value"),'Nombre con confirmación controlada');
      assert.equal(await evaluate("document.querySelector('.settings-editor button[type=submit]').disabled"),true);
      assert.equal(await evaluate("document.querySelector('.settings-editor').textContent.includes('Cambios guardados correctamente')"),false);
      respuestaConfiguracionIncompleta=false;
      await evaluate("[...document.querySelectorAll('.settings-editor button')].find(b=>b.textContent==='Recargar datos').click()");await esperar("Boolean(document.querySelector('dialog[open]'))");
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Descartar cambios').click()");
      await esperar("document.querySelector('#config-nombreComercial')?.value==='Alojamientos editados'");
      await fill('#config-nombreComercial','Guardado único');
      demoraGuardarConfiguracion=800;
      const previos=requests.filter(r=>r.method==='PUT'&&r.ruta==='/configuracion/empresa').length;
      await evaluate("document.querySelector('.settings-editor form').requestSubmit()");await esperar("Boolean(document.querySelector('dialog[open]'))");
      await evaluate("[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirmar guardado').click()");
      await esperar("document.querySelector('.settings-form-actions [role=status]')?.textContent==='Guardando…'");
      await evaluate("document.querySelector('.settings-editor form').requestSubmit();document.querySelector('.settings-editor form').requestSubmit()");
      await click('.sidebar-user');
      assert.equal(await evaluate("Boolean(document.querySelector('#config-nombreComercial'))"),true);
      assert.equal(await evaluate("document.querySelector('#config-nombreComercial').disabled"),true);
      await esperar("document.querySelector('.settings-editor').textContent.includes('Cambios guardados correctamente')");demoraGuardarConfiguracion=0;
      assert.equal(requests.filter(r=>r.method==='PUT'&&r.ruta==='/configuracion/empresa').length,previos+1);
      await click('.sidebar-logout');await esperar("Boolean(document.querySelector('#login-email'))");
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
      assert.ok(requests.slice(previas).every(r=>['/auth/me','/dashboard/resumen','/dashboard/historico','/monedas/estado'].includes(r.ruta) && ['GET','OPTIONS'].includes(r.method)));
      await click('.sidebar-user'); await esperar("Boolean(document.querySelector('#cuenta-nombre'))");
      await recargarInicio();
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"),false);
    });
    await t.test("Operador navega modulos, no ve Usuarios y cierra sesion", async () => {
      fase = "operador";
      assert.equal(await evaluate("document.querySelector('.sidebar-nav').textContent.includes('Usuarios')"), false);
      await comprobarUtilidades('Operador');
      assert.equal(await evaluate("document.querySelector('.settings-nav').textContent.includes('Datos de empresa') || document.querySelector('.settings-nav').textContent.includes('Preferencias operativas')"),false);
      await esperar("Boolean(document.querySelector('.theme-options'))");
      assert.equal(await evaluate("document.querySelectorAll('.settings-nav button').length"),3,"Operador accede a Apariencia, preferencias generales y personales.");
      await click('input[name=apariencia][value=oscuro]');
      datosVisuales = true;
      await evaluate("[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()==='Reservas').click()");
      demoraPredeterminados=350;
      await esperar("[...document.querySelectorAll('.main button')].some(b=>b.textContent.trim()==='Nueva reserva')");
      await evaluate("[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()==='Nueva reserva').click()");
      await esperar("Boolean(document.querySelector('input[name=horaIngreso]'))");await fill('input[name=horaIngreso]','17:10');
      await esperar("document.querySelector('.settings-defaults-status')?.textContent.includes('Horarios iniciales de la empresa')");
      assert.equal(await evaluate("document.querySelector('input[name=horaIngreso]').value"),'17:10');assert.equal(await evaluate("document.querySelector('input[name=horaEgreso]').value"),'08:45');
      await evaluate("[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()==='Cerrar formulario').click()");
      await evaluate("[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()==='Nueva reserva').click()");
      await esperar("document.querySelector('.settings-defaults-status')?.textContent.includes('Horarios iniciales de la empresa')");
      assert.equal(await evaluate("document.querySelector('input[name=horaIngreso]').value"),'17:10','Reabrir conserva el horario del borrador editado.');
      await evaluate("[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()==='Cerrar formulario').click()");demoraPredeterminados=0;
      const abrirReserva=()=>evaluate("[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()==='Nueva reserva').click()");
      const cerrarReserva=()=>evaluate("[...document.querySelectorAll('.main button')].find(b=>b.textContent.trim()==='Cerrar formulario').click()");
      for(const fallo of ['desactivada','inválida','red']) {
        configuracionActivada=fallo!=='desactivada';predeterminadosInvalidos=fallo==='inválida';falloRedPredeterminados=fallo==='red';
        await abrirReserva();await esperar("document.querySelector('.settings-defaults-status')?.textContent.includes('no disponible')");
        assert.equal(await evaluate("document.querySelector('input[name=horaIngreso]').value"),'17:10',`${fallo}: no cambia el borrador.`);
        await cerrarReserva();
      }
      configuracionActivada=true;predeterminadosInvalidos=false;falloRedPredeterminados=false;
      demoraPredeterminados=500;
      await abrirReserva();await esperar("document.querySelector('.settings-defaults-status')?.textContent.includes('Consultando')");
      await cerrarReserva();await new Promise(r=>setTimeout(r,600));
      assert.equal(await evaluate("Boolean(document.querySelector('input[name=horaIngreso]'))"),false,'La respuesta cancelada no reabre ni modifica formularios.');
      demoraPredeterminados=0;await abrirReserva();await esperar("document.querySelector('.settings-defaults-status')?.textContent.includes('Horarios iniciales')");
      const altas=requests.filter(r=>r.ruta==='/reservas'&&r.method==='POST').length;
      await esperar("Boolean(document.querySelector('select[name=idPropiedad] option[value=\"1\"]') && document.querySelector('select[name=idHuesped] option[value=\"1\"]'))");
      await evaluate("for(const name of ['idPropiedad','idHuesped']) {const el=document.querySelector(`select[name=${name}]`);el.value='1';el.dispatchEvent(new Event('change',{bubbles:true}));}");
      await fill('input[name=fechaIngreso]','2100-01-10'); await fill('input[name=fechaEgreso]','2100-01-12');
      await fill('input[name=cantidadHuespedes]','1'); await fill('input[name=montoEstimado]','0');
      await evaluate("document.querySelector('input[name=horaIngreso]').form.requestSubmit()");
      await esperar("!document.querySelector('input[name=horaIngreso]')");
      assert.equal(requests.filter(r=>r.ruta==='/reservas'&&r.method==='POST').length,altas+1,'Alta exclusivamente ficticia con API interceptada.');
      await abrirReserva();await esperar("document.querySelector('.settings-defaults-status')?.textContent.includes('Horarios iniciales')");
      assert.equal(await evaluate("document.querySelector('input[name=horaIngreso]').value"),'18:15','Alta exitosa limpia las horas modificadas del borrador anterior.');
      await cerrarReserva();
      for (const label of ["Propiedades", "Reservas", "Huéspedes", "Calendario", "Limpiezas", "Alertas", "Reportes"]) {
        fase = `visual ${label}`;
        await evaluate(`[...document.querySelectorAll('.sidebar-nav button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
        await new Promise((r) => setTimeout(r, 150));
        assert.equal(await evaluate("Boolean(document.querySelector('.sidebar'))"), true, `${label}: ${JSON.stringify(excepciones)}`);
        assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
        const whites = await evaluate("[...document.querySelectorAll('.main *')].filter(e=>e.getBoundingClientRect().width>0 && e.getBoundingClientRect().height>0 && getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)').map(e=>e.className).filter(n=>typeof n==='string')");
        assert.deepEqual(whites,[],`Superficies claras sin tematizar en ${label}.`);
        await capturar(`oscuro-${label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}`);
        await evaluate("globalThis.HostFlowAppearance.setPreference('claro')");
        assert.equal(await evaluate("document.documentElement.dataset.theme"),'light');
        await capturar(`claro-${label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}`);
        await evaluate("globalThis.HostFlowAppearance.setPreference('oscuro')");
        await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true,`${label} sin desborde en móvil.`);
        await capturar(`movil-${label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}`);
        await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      }
      await click("button[aria-label='Abrir FlowIA']"); await esperar("Boolean(document.querySelector('[aria-label=FlowIA]'))");
      await esperar("document.querySelector('[aria-label=FlowIA]').textContent.includes('Limpieza ficticia')");
      await capturar('oscuro-flowia');
      await click('.flowia-close');await esperar("!document.querySelector('.flowia-panel')");
      await click(".sidebar-logout"); await esperar("Boolean(document.querySelector('#login-email'))");
      assert.equal(await evaluate("localStorage.getItem('token')"), null);
    });
    }
    const contexto={t,evaluate,send,click,fill,esperar,login,inicioVisible,capturar,requests,modulosCliente,altasReservas,cambiosReservas,snapshotJornada:jornada.snapshot,activarApiUniversitaria:async crear=>{apiUniversitaria=await crear();return apiUniversitaria;},denegarDescargas:()=>cdp.send('Browser.setDownloadBehavior',{behavior:'deny'}),fase:valor=>{fase=valor;},fixture:valores=>{
      jornada.configurar(valores);
      if(Object.hasOwn(valores,'monedasActivas'))monedasActivas=valores.monedasActivas;
      if(Object.hasOwn(valores,'monedasEscritura'))monedasEscritura=valores.monedasEscritura;
      if(Object.hasOwn(valores,'falloBcraMonedas'))falloBcraMonedas=valores.falloBcraMonedas;
      if(Object.hasOwn(valores,'falloGuardadoMonedas'))falloGuardadoMonedas=valores.falloGuardadoMonedas;
      if(Object.hasOwn(valores,'configMonedas'))configMonedas=valores.configMonedas;
      if(Object.hasOwn(valores,'tarifasMonedas'))tarifasMonedas=valores.tarifasMonedas;
      if(Object.hasOwn(valores,'avisoTarifaMonedas'))avisoTarifaMonedas=valores.avisoTarifaMonedas;
      if(Object.hasOwn(valores,'formularioRealPrueba')) {formularioRealPrueba=valores.formularioRealPrueba;reservaFormulario=null;}
      if(Object.hasOwn(valores,'modoPropiedadesReserva'))modoPropiedadesReserva=valores.modoPropiedadesReserva;
      if(Object.hasOwn(valores,'modoHuespedesReserva'))modoHuespedesReserva=valores.modoHuespedesReserva;
      if(Object.hasOwn(valores,'demoraCatalogosReserva'))demoraCatalogosReserva=valores.demoraCatalogosReserva;
      if(Object.hasOwn(valores,'falloEdicionReserva'))falloEdicionReserva=valores.falloEdicionReserva;
      if(Object.hasOwn(valores,'falloCancelacionReserva'))falloCancelacionReserva=valores.falloCancelacionReserva;
      if(Object.hasOwn(valores,'rol'))current=[...users.values()].find(u=>u.rol===valores.rol&&u.estado==='Activo');
      if(Object.hasOwn(valores,'datosVisuales'))datosVisuales=valores.datosVisuales;
      if(Object.hasOwn(valores,'listaLarga'))listaHuespedesLarga=valores.listaLarga;
      if(Object.hasOwn(valores,'demoraDetalle'))demoraDetalleHuesped=valores.demoraDetalle;
      if(Object.hasOwn(valores,'modoDetalle'))modoDetalleHuesped=valores.modoDetalle;
      if(Object.hasOwn(valores,'soloLectura'))soloLecturaConfiguracion=valores.soloLectura;
      if(Object.hasOwn(valores,'estadoAusente'))estadoConfiguracionAusente=valores.estadoAusente;
      if(Object.hasOwn(valores,'falloFlowIA'))falloFlowIA=valores.falloFlowIA;
      if(Object.hasOwn(valores,'demoraFlowIA'))demoraFlowIA=valores.demoraFlowIA;
      if(Object.hasOwn(valores,'destinoFlowIA'))destinoFlowIA=valores.destinoFlowIA;
      if(Object.hasOwn(valores,'modoFlowIA'))modoFlowIA=valores.modoFlowIA;
      if(Object.hasOwn(valores,'demoraReservaAnterior'))demoraReservaAnterior=valores.demoraReservaAnterior;
      if(Object.hasOwn(valores,'detalleReservaIncompleto'))detalleReservaIncompleto=valores.detalleReservaIncompleto;
      if(Object.hasOwn(valores,'dosReservas'))dosReservas=valores.dosReservas;
      if(Object.hasOwn(valores,'falloMantenimiento'))falloMantenimiento=valores.falloMantenimiento;
      if(Object.hasOwn(valores,'falloAltaReserva'))falloAltaReserva=valores.falloAltaReserva;
      if(Object.hasOwn(valores,'modoAvisos'))modoAvisos=valores.modoAvisos;
      if(Object.hasOwn(valores,'demoraAvisos'))demoraAvisos=valores.demoraAvisos;
      if(Object.hasOwn(valores,'modoPreferencias'))modoPreferencias=valores.modoPreferencias;
      if(Object.hasOwn(valores,'conflictoPreferencias'))conflictoPreferencias=valores.conflictoPreferencias;
      if(Object.hasOwn(valores,'demoraPreferencias'))demoraPreferencias=valores.demoraPreferencias;
      if(Object.hasOwn(valores,'sinNotificaciones'))sinNotificaciones=valores.sinNotificaciones;
    }};
    if(!soloJornada&&!soloNocturno)await probarPulidoUX(contexto);
    if(!soloJornada&&!soloNocturno)await probarReportesVisuales(contexto);
    if(!soloJornada&&!soloNocturno&&!soloPulido){
    await probarPrioridades(contexto);
    await probarNotificaciones(contexto);
    await probarRegresionIntegral(contexto);
    await probarOperacionesExplicitas(contexto);
    await probarCreacionAtomica(contexto);
    await probarFormularioReservas(contexto);
    await probarMonedas(contexto);
    }
    if(!soloNocturno&&!soloPulido)await probarJornadaMonetaria(contexto);
    if(!soloJornada&&!soloPulido)await probarCierreNocturno(contexto);
    assert.equal(excepciones.length, 0, "El navegador no debe tener excepciones en los flujos probados.");
  } catch { if(excepciones.length)process.stderr.write(JSON.stringify({excepcionesAisladas:excepciones})+'\n');throw new Error(`Falló el navegador aislado en ${fase} (estado del proceso: ${child?.exitCode ?? "activo"}); no se imprimieron credenciales ni tokens.`); }
  finally {
    if (cdp && socket?.readyState === WebSocket.OPEN) {
      try { await cdp.send("Browser.close"); } catch { /* El navegador puede cerrar el socket antes de responder. */ }
    }
    socket?.close(); child?.kill(); await apiUniversitaria?.cerrar(); await vite?.close(); cache.limpiar();
  }
});
