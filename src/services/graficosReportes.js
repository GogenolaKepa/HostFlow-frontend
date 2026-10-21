// Solo cantidades operativas. Los importes monetarios nunca pasan por estos gráficos.
export function distribucionCantidades(filas) {
 const validas=filas.filter(f=>/^\d+$/.test(String(f.valor))).map(f=>({...f,exacto:BigInt(f.valor)}));
 const total=validas.reduce((n,f)=>n+f.exacto,0n);
 return {total:total.toString(),filas:validas.map(f=>({...f,fraccion:total?Number(f.exacto*1000000n/total)/1000000:0}))};
}
export function puntosTendencia(filas,campo,maximo) {
 const datos=filas.filter(f=>typeof f[campo]==='number'&&Number.isFinite(f[campo])&&f[campo]>=0);
 const techo=maximo||Math.max(1,...datos.map(f=>f[campo]));
 return {techo,puntos:datos.map((f,i)=>({...f,x:datos.length===1?320:48+i*544/(datos.length-1),y:202-Math.min(1,f[campo]/techo)*168}))};
}
