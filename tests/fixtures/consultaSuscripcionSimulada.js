// Empresas, sesiones y consumos ficticios. Conserva la forma del contrato V1.
export const empresas = [
  { idEmpresa: 101, nombre: 'Empresa ficticia Costa' },
  { idEmpresa: 102, nombre: 'Empresa ficticia Sierra' },
];

export const datosCosta = {
  empresaId: 101,
  plan: { codigo: 'profesional', nombre: 'Profesional', propiedades: 10, usuarios: 3, anualCentavos: null },
  ciclo: 'anual',
  consumo: { propiedades: 2, usuarios: 2, invitacionesPendientes: 1, usuariosOcupados: 3 },
};

const datosSierra = {
  empresaId: 102,
  plan: { codigo: 'inicial', nombre: 'Inicial', propiedades: 2, usuarios: 1, anualCentavos: null },
  ciclo: 'mensual',
  consumo: { propiedades: 0, usuarios: 1, invitacionesPendientes: 0, usuariosOcupados: 1 },
};

export const capacidades = { version: 1, disponible: true, cobrosAutomaticos: false };
export const contextos = new Map([[101, 'A'.repeat(43)], [102, 'B'.repeat(42) + 'A']]);

function negar(status) {
  throw Object.assign(new Error('Solicitud rechazada por el simulador'), { response: { status } });
}

export function crearApiSimulada(usuario) {
  const habilitadas = empresas.filter(empresa =>
    usuario?.rol === 'Administrador' || usuario?.rol === 'Operador' && empresa.idEmpresa === 102);
  const emitidos = new Map();

  function acreditarSesion() {
    if (!usuario || usuario.debeCambiarPassword !== false) negar(401);
    if (!['Administrador', 'Operador'].includes(usuario.rol)) negar(403);
  }

  return {
    async get(ruta, { headers } = {}) {
      acreditarSesion();
      if (ruta === '/suscripcion/capacidades') return { data: capacidades };
      if (ruta === '/suscripcion/empresas') return { data: habilitadas };
      if (ruta === '/suscripcion/actual') {
        const idEmpresa = emitidos.get(headers?.['X-HostFlow-Empresa']);
        if (!idEmpresa) negar(401);
        return { data: idEmpresa === 101 ? datosCosta : datosSierra };
      }
      negar(404);
    },
    async post(ruta, { idEmpresa }) {
      acreditarSesion();
      if (ruta !== '/suscripcion/contexto' || !habilitadas.some(empresa => empresa.idEmpresa === idEmpresa)) negar(404);
      const contexto = contextos.get(idEmpresa);
      emitidos.set(contexto, idEmpresa);
      return { data: { contexto, expiraEn: new Date(Date.now() + 300000).toISOString() } };
    },
  };
}
