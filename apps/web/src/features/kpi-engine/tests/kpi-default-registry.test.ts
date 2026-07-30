import assert from "node:assert/strict"
import test from "node:test"

import { KPIEngine, createDefaultKPIRegistry } from ".."

const expected = [
  ["example.count", "kpi-example-count-v1"],
  ["example.percentage", "kpi-example-percentage-v1"],
  ["system.health", "kpi-system-health-v1"],
  ["system.latency", "kpi-system-latency-v1"],
] as const

test("factory cria registry com definições demonstrativas estáveis", () => {
  const registry = createDefaultKPIRegistry()
  assert.deepEqual(registry.list().map((item) => [item.key, item.definitionId]), expected)
  assert.deepEqual(registry.list().map((item) => item.version), [1, 1, 1, 1])
})

test("factory não registra definição real de Planning", () => {
  assert.equal(createDefaultKPIRegistry().list().some((item) => item.key.startsWith("planning.")), false)
})

test("chamadas retornam registries independentes", () => {
  const first = createDefaultKPIRegistry()
  const second = createDefaultKPIRegistry()
  first.register({
    ...first.getByKey("example.count", 1),
    definitionId: "extra-id",
    key: "extra.key",
    definition: {
      ...first.getByKey("example.count", 1).definition,
      id: "extra-id",
      key: "extra.key",
    },
  })
  assert.equal(first.hasKey("extra.key"), true)
  assert.equal(second.hasKey("extra.key"), false)
})

test("definições demonstrativas podem ser avaliadas com input validado", () => {
  const definition = createDefaultKPIRegistry().getByKey("example.count", 1).definition
  assert.equal(KPIEngine.create().analyze({ definition, source: { value: 7 } }).result.value, 7)
})

test("calculator demonstrativo rejeita input incompatível", () => {
  const definition = createDefaultKPIRegistry().getByKey("system.health", 1).definition
  assert.throws(() => KPIEngine.create().analyze({ definition, source: { wrong: true } }), TypeError)
})
