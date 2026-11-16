// Las credenciales solo se adjuntan al origen API esperado y a rutas locales de imágenes.
export function clasificarImagen(src,apiBase,origen){
 if(typeof src!=='string'||!src)return null;
 try{
  const base=new URL(apiBase,origen),url=new URL(src,base.origin);
  // Referencias históricas del mismo servidor: reconstruir HTTPS, nunca solicitar HTTP.
  if(base.protocol==='https:'&&url.protocol==='http:'&&url.hostname===base.hostname&&url.port===base.port)url.protocol='https:';
  if(url.username||url.password||url.hash||url.search)return null;
  if(url.origin===base.origin&&/^\/uploads\/propiedades\/[1-9]\d{0,9}\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(url.pathname))return {privada:true,url:url.href};
  if(url.origin!==base.origin&&url.protocol==='https:')return {privada:false,url:url.href};
  return null;
 }catch{return null;}
}
