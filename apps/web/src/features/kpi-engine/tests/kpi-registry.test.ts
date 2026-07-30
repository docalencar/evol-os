import assert from "node:assert/strict"
import test from "node:test"

import { KPIRegistry, KPIRegistryError } from ".."
import { february, january, march, version } from "./kpi-test-fixtures"

test("registry registra e lista uma definição", () => {
  const registry = new KPIRegistry()
  registry.register(version())
  assert.equal(registry.list().length, 1)
})

test("registry registra várias definições atomicamente", () => {
  const registry = new KPIRegistry()
  registry.registerMany([
    version(),
    version({ definitionId: "definition-2", key: "test.other" }, { id: "definition-2", key: "test.other" }),
  ])
  assert.equal(registry.list().length, 2)
})

test("busca por ID e versão", () => {
  const registry = registryWithVersions()
  assert.equal(registry.getById("definition-1", 2).version, 2)
})

test("busca por key e versão", () => {
  assert.equal(registryWithVersions().getByKey("test.metric", 1).version, 1)
})

test("resolve versão ativa na data informada", () => {
  assert.equal(registryWithVersions().getActiveByKey("test.metric", march).version, 2)
})

test("resolve versão ativa histórica", () => {
  assert.equal(registryWithVersions().getActiveByKey("test.metric", january).version, 1)
})

test("lista versões por key", () => {
  assert.deepEqual(registryWithVersions().listVersionsByKey("test.metric").map((item) => item.version), [1, 2])
})

test("lista por ownerModule e categoria", () => {
  const registry = registryWithVersions()
  assert.equal(registry.listByOwnerModule("test-module").length, 2)
  assert.equal(registry.listByCategory("test-category").length, 2)
})

test("ordena deterministicamente por key e versão", () => {
  const registry = new KPIRegistry()
  registry.registerMany([
    version({ definitionId: "z", key: "z.key" }, { id: "z", key: "z.key" }),
    version({ definitionId: "a", key: "a.key" }, { id: "a", key: "a.key" }),
  ])
  assert.deepEqual(registry.list().map((item) => item.key), ["a.key", "z.key"])
})

for (const invalidVersion of [0, -1, 1.5]) {
  test(`rejeita version inválida: ${invalidVersion}`, () => {
    assertRegistryError(() => new KPIRegistry().register(version({ version: invalidVersion })), "INVALID_DEFINITION_VERSION")
  })
}

test("rejeita key vazia", () => {
  assertRegistryError(() => new KPIRegistry().register(version({ key: "" }, { key: "" })), "INVALID_DEFINITION_VERSION")
})

test("rejeita definitionId vazio", () => {
  assertRegistryError(() => new KPIRegistry().register(version({ definitionId: "" }, { id: "" })), "INVALID_DEFINITION_VERSION")
})

test("rejeita key e versão duplicadas", () => {
  const registry = new KPIRegistry()
  registry.register(version())
  assertRegistryError(() => registry.register(version({ definitionId: "definition-2" }, { id: "definition-2" })), "DUPLICATE_DEFINITION_KEY_VERSION")
})

test("rejeita ID e versão duplicados", () => {
  const registry = new KPIRegistry()
  registry.register(version())
  assertRegistryError(() => registry.register(version({ key: "other.key" }, { key: "other.key" })), "DUPLICATE_DEFINITION_ID_VERSION")
})

test("rejeita mismatch de key", () => {
  assertRegistryError(() => new KPIRegistry().register(version({}, { key: "wrong.key" })), "DEFINITION_KEY_MISMATCH")
})

test("rejeita mismatch de ID", () => {
  assertRegistryError(() => new KPIRegistry().register(version({}, { id: "wrong-id" })), "DEFINITION_ID_MISMATCH")
})

test("rejeita período invertido", () => {
  assertRegistryError(() => new KPIRegistry().register(version({ effectiveFrom: february, effectiveUntil: january })), "INVALID_EFFECTIVE_PERIOD")
})

test("rejeita períodos sobrepostos", () => {
  const registry = new KPIRegistry()
  registry.register(version({ effectiveUntil: march, active: false }))
  assertRegistryError(() => registry.register(version({ version: 2, effectiveFrom: february, active: false })), "OVERLAPPING_DEFINITION_PERIOD")
})

test("rejeita duas versões ativas simultâneas", () => {
  const registry = new KPIRegistry()
  registry.register(version({ effectiveUntil: march }))
  assertRegistryError(() => registry.register(version({ version: 2, effectiveFrom: february })), "MULTIPLE_ACTIVE_DEFINITIONS")
})

test("erro tipado ao buscar definição inexistente", () => {
  assertRegistryError(() => new KPIRegistry().getByKey("missing", 1), "DEFINITION_NOT_FOUND")
})

test("registry não expõe Maps, arrays, objetos ou datas mutáveis", () => {
  const source = version()
  const registry = new KPIRegistry()
  registry.register(source)
  source.effectiveFrom.setUTCFullYear(2030)
  const listed = registry.list()
  assert.equal(listed[0]?.effectiveFrom.toISOString(), "2026-01-01T00:00:00.000Z")
  assert.equal(Object.isFrozen(listed), true)
  assert.equal(Object.isFrozen(listed[0]?.definition), true)
})

function registryWithVersions(): KPIRegistry {
  const registry = new KPIRegistry()
  registry.registerMany([
    version({ effectiveUntil: february }),
    version({ version: 2, effectiveFrom: february }),
  ])
  return registry
}

function assertRegistryError(operation: () => unknown, code: KPIRegistryError["code"]): void {
  assert.throws(operation, (error) => error instanceof KPIRegistryError && error.code === code)
}
