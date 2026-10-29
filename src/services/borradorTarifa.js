import {unidades} from './monedasCalculos.js';

export function tarifaModificada(moneda, precio, original) {
  if (moneda !== (original?.moneda || '')) return true;
  const anterior = original?.precio ?? '';
  if (String(precio) === String(anterior)) return false;
  try { return unidades(precio) !== unidades(anterior); }
  catch { return true; }
}
