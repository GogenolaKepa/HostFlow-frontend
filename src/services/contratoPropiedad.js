export function guardadoPropiedadValido(propiedad,datos,id){
 if(!propiedad||!Number.isInteger(propiedad.idPropiedad)||propiedad.idPropiedad<=0||(id&&propiedad.idPropiedad!==Number(id)))return false;
 return Object.entries(datos).every(([campo,valor])=>campo==='capacidadMaxima'?Number(propiedad[campo])===valor:propiedad[campo]===valor);
}
