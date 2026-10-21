// Preferencia local por cuenta; no representa una notificación ni una lectura SQL.
export const claveAvisoMonetario=id=>`hostflow:aviso-monetario:v1:${id}`;
export function avisoMonetarioOculto(id,storage){
 try{return (storage??window.localStorage).getItem(claveAvisoMonetario(id))==='oculto';}catch{return false;}
}
export function ocultarAvisoMonetario(id,storage){
 try{(storage??window.localStorage).setItem(claveAvisoMonetario(id),'oculto');return true;}catch{return false;}
}
