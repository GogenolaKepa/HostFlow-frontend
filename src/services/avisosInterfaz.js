import { guardarPreferenciaCuenta, leerPreferenciaCuenta } from './preferenciasCuenta.js';

const AVISO_MONETARIO = 'hostflow:aviso-monetario:v1';
export const avisoMonetarioOculto = (ambito, storage) => leerPreferenciaCuenta(AVISO_MONETARIO, ambito, storage) === 'oculto';
export const ocultarAvisoMonetario = (ambito, storage) => guardarPreferenciaCuenta(AVISO_MONETARIO, ambito, 'oculto', storage);
