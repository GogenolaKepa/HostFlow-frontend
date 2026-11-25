const tiempoMaximo = 15000;
export const consultaSuscripcionHabilitada = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_CONSULTA_SUSCRIPCION === '1';
const planesV1 = ['inicial', 'profesional', 'gestion'];
const nombreCiclo = { mensual: 'Mensual', anual: 'Anual' };
// Base64url canónico sin relleno para los 32 bytes que emite el backend.
const formatoContexto = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const natural = valor => Number.isSafeInteger(valor) && valor >= 0;
const idValido = valor => natural(valor) && valor > 0 && valor <= 2147483647;
const textoValido = valor => typeof valor === 'string' && valor.trim().length > 0;

function errorConsulta(codigo) {
  return Object.assign(new Error(codigo), { codigo });
}

export async function listarEmpresasSuscripcion(api, signal) {
  const opciones = { signal, timeout: tiempoMaximo };
  const { data: capacidades } = await api.get('/suscripcion/capacidades', opciones);
  signal?.throwIfAborted();
  if (capacidades?.version !== 1 || capacidades.disponible !== true || capacidades.cobrosAutomaticos !== false) {
    throw errorConsulta('CONSULTA_NO_DISPONIBLE');
  }

  const { data: empresas } = await api.get('/suscripcion/empresas', opciones);
  signal?.throwIfAborted();
  if (!Array.isArray(empresas) || empresas.some(empresa => !idValido(empresa?.idEmpresa) ||
      !textoValido(empresa?.nombre)) || new Set(empresas.map(empresa => empresa.idEmpresa)).size !== empresas.length) {
    throw errorConsulta('EMPRESAS_NO_ACREDITADAS');
  }
  return empresas.map(({ idEmpresa, nombre }) => ({ idEmpresa, nombre }));
}

function validarResumen(datos, idEmpresa) {
  const { empresaId, plan, ciclo, consumo } = datos ?? {};
  if (empresaId !== idEmpresa || !planesV1.includes(plan?.codigo) || !textoValido(plan.nombre) ||
      !natural(plan.propiedades) || plan.propiedades === 0 ||
      !natural(plan.usuarios) || plan.usuarios === 0 ||
      typeof ciclo !== 'string' || !Object.hasOwn(nombreCiclo, ciclo) ||
      !natural(consumo?.propiedades) || !natural(consumo.usuarios) ||
      !natural(consumo.invitacionesPendientes) || !natural(consumo.usuariosOcupados) ||
      consumo.usuariosOcupados !== consumo.usuarios + consumo.invitacionesPendientes) {
    throw errorConsulta('SUSCRIPCION_NO_ACREDITADA');
  }
  return {
    codigoPlan: plan.codigo,
    nombrePlan: plan.nombre,
    ciclo: nombreCiclo[ciclo],
    limitePropiedades: plan.propiedades,
    limiteUsuarios: plan.usuarios,
    propiedadesActivas: consumo.propiedades,
    usuariosActivos: consumo.usuarios,
    invitacionesPendientes: consumo.invitacionesPendientes,
    cuposUsuariosOcupados: consumo.usuariosOcupados,
  };
}

export async function consultarSuscripcionEmpresa(api, idEmpresa, signal) {
  if (!idValido(idEmpresa)) throw errorConsulta('EMPRESA_INVALIDA');
  signal?.throwIfAborted();
  const opciones = { signal, timeout: tiempoMaximo };
  // El contexto solo vive durante esta consulta, sin modificar el cliente autenticado.
  const { data } = await api.post('/suscripcion/contexto', { idEmpresa }, opciones);
  signal?.throwIfAborted();
  if (typeof data?.contexto !== 'string' || !formatoContexto.test(data.contexto) ||
      typeof data.expiraEn !== 'string' || !(Date.parse(data.expiraEn) > Date.now())) {
    throw errorConsulta('CONTEXTO_NO_ACREDITADO');
  }
  const { data: actual } = await api.get('/suscripcion/actual', {
    ...opciones,
    headers: { 'X-HostFlow-Empresa': data.contexto },
  });
  signal?.throwIfAborted();
  return validarResumen(actual, idEmpresa);
}
