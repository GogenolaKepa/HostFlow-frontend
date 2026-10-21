// Los textos de catálogos deben conservarse como datos, no fórmulas de planilla.
export function textoPlanilla(valor){
 const texto=String(valor??'');
 return typeof valor==='string'&&/^\s*[=+\-@]/u.test(texto)?"'"+texto:texto;
}
export function celdaCsv(valor){
 const texto=textoPlanilla(valor);
 return /[;"\r\n]/.test(texto)?'"'+texto.replaceAll('"','""')+'"':texto;
}
