// Valores públicos de build; nunca credenciales. No lee red ni almacenamiento.
const local = host => ['localhost','127.0.0.1','[::1]'].includes(host) || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
export function validarBaseApi(valor,{desarrollo=false}={}) {
  if(valor==='/api')return valor;
  const u=new URL(valor);
  if(u.username||u.password||u.search||u.hash||u.pathname!=='/api'||u.origin+u.pathname!==valor)throw Error('URL pública de API inválida.');
  if(desarrollo && local(u.hostname) && ['http:','https:'].includes(u.protocol))return valor;
  if(u.protocol!=='https:'||local(u.hostname)||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||/(?:^|\.)(local|internal|localhost)$/.test(u.hostname)||u.hostname.endsWith('.'))throw Error('La API pública requiere HTTPS y un dominio válido.');
  return valor;
}
export function resolverBaseApi({env={},ubicacion}={}) {
  const desarrollo=env.DEV===true;
  const configurada=env.VITE_API_URL?.trim();
  if(configurada)return validarBaseApi(configurada,{desarrollo});
  if(!desarrollo)return '/api'; // Nunca construir :4000 en un sitio publicado.
  if(!ubicacion||!['http:','https:'].includes(ubicacion.protocol))throw Error('Ubicación local inválida.');
  return `${ubicacion.protocol}//${ubicacion.hostname}:4000/api`;
}
export function validarBuildPublico(env={},modo='production') {
  if(Object.keys(env).some(k=>k.startsWith('VITE_')&&/(SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE|CIFRADO|INDICE|CREDENTIAL|CONNECTION|DPAPI)/i.test(k)))throw Error('No incluir secretos en variables VITE públicas.');
  validarBaseApi(env.VITE_API_URL?.trim()||'/api');
  if(modo==='cloudflare'&&(env.VITE_API_URL!=='https://api.hostflow.com.ar/api'||env.VITE_PUBLIC_ORIGIN!=='https://hostflow.com.ar'))throw Error('Build Cloudflare bloqueado: requiere origen público y API aprobados.');
}
