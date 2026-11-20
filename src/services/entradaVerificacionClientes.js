export function prepararEntradaVerificacion(href, reemplazar) {
  const url = new URL(href);
  if (url.pathname !== '/clientes/verificar') return null;

  const partes = new URLSearchParams(url.hash.slice(1));
  const valor = partes.get('token');
  // Un token de 32 bytes tiene dos bits de relleno en el último carácter base64url.
  const token = !url.searchParams.has('token') && partes.size === 1 && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(valor ?? '')
    ? valor
    : null;
  if (url.search || url.hash) reemplazar(url.pathname);
  return { token };
}
