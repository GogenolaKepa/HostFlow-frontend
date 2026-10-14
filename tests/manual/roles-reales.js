// Herramienta manual de prueba, fuera de los entrypoints de produccion.
// El token permanece en el navegador y solo se envia al backend local habitual.
const CAMPOS_OPERATIVOS_CON_INGRESO = new Set(["fechaIngreso","horaIngreso","reservasConIngreso"]);
export function contieneEconomia(value) {
  if (!value || typeof value!=="object") return false;
  return Object.entries(value).some(([key,child])=>
    (!CAMPOS_OPERATIVOS_CON_INGRESO.has(key) && /monto|importe|ingres|precio|tarifa|comision|saldo|ganancia|factur/i.test(key)) || contieneEconomia(child));
}

export async function comprobarSesion({token,fetcher=fetch,hostname=location.hostname,port=location.port}={}) {
  if (!["127.0.0.1","localhost"].includes(hostname) || port!=="5173" || !token) {
    throw new Error("Abrí esta página desde HostFlow local con tu sesión iniciada.");
  }
  const base=`http://${hostname}:4000/api`;
  const resultados=[];
  const resultado=(nombre,ok,detalle="")=>resultados.push({nombre,ok,detalle});
  const get=(ruta,autenticada=true)=>fetcher(base+ruta,{method:"GET",cache:"no-store",
    headers:autenticada?{Authorization:`Bearer ${token}`}:{}});
  const response=await get("/auth/me");
  if (response.status!==200) throw new Error(`La sesión no está disponible (HTTP ${response.status}).`);
  const {usuario}=await response.json();
  if (!["Administrador","Operador"].includes(usuario?.rol) || usuario.debeCambiarPassword ||
      usuario.origenAutenticacion!=="sql" || !Array.isArray(usuario.permisos)) {
    throw new Error("Primero completá el cambio obligatorio con una cuenta SQL habilitada.");
  }
  const admin=usuario.rol==="Administrador";
  resultado("Sesión SQL y cambio de contraseña completado",true,usuario.rol);
  for (const permiso of ["usuarios.ver","usuarios.crear","usuarios.modificar","usuarios.estado","usuarios.restablecer",
    "roles.ver","dashboard.economia","reportes.economia","reportes.exportar","flowia.comercial",
    "propiedades.gestionar","reservas.cancelar","reservas.importes","canales.gestionar","integraciones.gestionar"]) {
    resultado(`Permiso ${permiso}`,usuario.permisos.includes(permiso)===admin,admin?"Permitido":"Restringido");
  }
  const sinToken=await get("/usuarios",false);
  resultado("Usuarios sin autenticación",sinToken.status===401,`HTTP ${sinToken.status}`);
  for (const ruta of ["/usuarios","/roles"]) {
    const res=await get(ruta);
    resultado(`GET ${ruta}`,res.status===(admin?200:403),`HTTP ${res.status}`);
    // No leer ni mostrar listas de cuentas o roles del cuerpo.
  }
  for (const ruta of ["/dashboard/reportes","/dashboard/historico"]) {
    const res=await get(ruta);
    resultado(`GET ${ruta} solo lectura`,res.status===200,`HTTP ${res.status}`);
    if (res.status===200) {
      const payload=await res.json();
      resultado(`Filtro económico ${ruta}`,admin ? usuario.permisos.includes("reportes.economia") : !contieneEconomia(payload),admin?"Acceso administrativo":"Sin campos económicos");
    }
  }
  return resultados; // Solo labels/booleanos/status; nunca perfil, filas, importes o token.
}

if (typeof document!=="undefined") {
  const button=document.getElementById("comprobar");
  button?.addEventListener("click",async()=>{
    const estado=document.getElementById("estado"),tbody=document.getElementById("resultados");
    button.disabled=true;tbody.replaceChildren();estado.textContent="Comprobando…";
    try {
      const resultados=await comprobarSesion({token:localStorage.getItem("token")});
      for (const item of resultados) {
        const tr=document.createElement("tr"),name=document.createElement("td"),value=document.createElement("td");
        name.textContent=item.nombre;value.textContent=`${item.ok?"OK":"REVISAR"} · ${item.detalle}`;
        tr.append(name,value);tbody.append(tr);
      }
      estado.textContent=resultados.every(r=>r.ok)?"Todas las comprobaciones de esta sesión aprobaron.":"Hay resultados para revisar. Compartí solo los estados, sin datos privados.";
    } catch { estado.textContent="No se completó la comprobación. Verificá sesión, cambio obligatorio y disponibilidad local. No se mostraron datos privados."; }
    finally {button.disabled=false;}
  });
}
