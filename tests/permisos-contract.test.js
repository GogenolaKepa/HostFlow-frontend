import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const contrato = JSON.parse(fs.readFileSync(new URL("./fixtures/permisos.json", import.meta.url), "utf8"));
const backend = new URL("../../backend/src/config/permisos.js", import.meta.url);

test("fixture de permisos declara origen y huella verificable", () => {
  assert.deepEqual(Object.keys(contrato.permisosPorRol), ["Administrador", "Operador"]);
  assert.match(contrato.origen.commit, /^[a-f0-9]{40}$/);
  assert.equal(createHash("sha256").update(JSON.stringify(contrato.permisosPorRol)).digest("hex"), contrato.origen.sha256);
  assert.ok(contrato.permisosPorRol.Administrador.includes("usuarios.ver"));
  assert.equal(contrato.permisosPorRol.Operador.includes("usuarios.ver"), false);
});

test("contrato del browser coincide con permisos reales del backend", {
  skip: fs.existsSync(backend) ? false : "Backend ausente: comparar ambos checkouts antes de publicar; contrato no verificado contra servidor.",
}, () => {
  const { PERMISOS_POR_ROL } = createRequire(import.meta.url)(fileURLToPath(backend));
  assert.deepEqual(contrato.permisosPorRol, PERMISOS_POR_ROL, "Cambió el catálogo: actualizar y revisar el fixture explícitamente.");
});
