import assert from "node:assert/strict";
import { test } from "node:test";
import { puedeGestionarUsuarios, validarPasswordNueva } from "../src/services/cuentas.js";

test("politica local de password cuenta bytes Unicode y confirmacion", () => {
  assert.notEqual(validarPasswordNueva("a".repeat(12) + "\n", "a".repeat(12) + "\n"), "");
  assert.equal(validarPasswordNueva("a".repeat(72), "a".repeat(72)), "");
  assert.notEqual(validarPasswordNueva("a".repeat(73), "a".repeat(73)), "");
  assert.equal(validarPasswordNueva("😀".repeat(18), "😀".repeat(18)), "");
  assert.notEqual(validarPasswordNueva("😀".repeat(19), "😀".repeat(19)), "");
  assert.notEqual(validarPasswordNueva("a".repeat(12), "b".repeat(12)), "");
});
test("Usuarios solo se habilita con permiso verificado y cambio completado en SQL", () => {
  const usuario = { gestionCuentasDisponible: true, debeCambiarPassword: false, permisos: ["usuarios.ver"] };
  assert.equal(puedeGestionarUsuarios(usuario), true);
  assert.equal(puedeGestionarUsuarios({ ...usuario, permisos: [] }), false);
  assert.equal(puedeGestionarUsuarios({ ...usuario, gestionCuentasDisponible: false }), false);
  assert.equal(puedeGestionarUsuarios({ ...usuario, debeCambiarPassword: true }), false);
});
