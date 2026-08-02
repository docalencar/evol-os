import assert from "node:assert/strict"
import test from "node:test"

import type {
  DecisionFeedProvider,
} from "../../aggregators"
import {
  ExecutiveDecisionFeedProviderRegistry,
} from "../executive-decision-feed-provider-registry"

test("registra providers preservando a ordem", () => {
  const first = createProvider("first")
  const second = createProvider("second")

  const registry =
    new ExecutiveDecisionFeedProviderRegistry()
      .register(first)
      .register(second)

  assert.deepEqual(
    registry.list(),
    [first, second],
  )
})

test("registra múltiplos providers", () => {
  const providers = [
    createProvider("first"),
    createProvider("second"),
  ]

  const registry =
    new ExecutiveDecisionFeedProviderRegistry()
      .registerMany(providers)

  assert.deepEqual(
    registry.list(),
    providers,
  )
})

test("rejeita provider com chave vazia", () => {
  const registry =
    new ExecutiveDecisionFeedProviderRegistry()

  assert.throws(
    () =>
      registry.register(
        createProvider("   "),
      ),
    /não pode estar vazia/,
  )
})

test("rejeita providers duplicados", () => {
  const registry =
    new ExecutiveDecisionFeedProviderRegistry()
      .register(createProvider("people"))

  assert.throws(
    () =>
      registry.register(
        createProvider("people"),
      ),
    /Provider duplicado/,
  )
})

test("retorna uma lista imutável", () => {
  const registry =
    new ExecutiveDecisionFeedProviderRegistry()
      .register(createProvider("people"))

  assert.equal(
    Object.isFrozen(registry.list()),
    true,
  )
})

function createProvider(
  key: string,
): DecisionFeedProvider {
  return {
    key,

    async load() {
      return Object.freeze({
        generatedAt:
          "2026-08-01T12:00:00.000Z",
        items: Object.freeze([]),
      })
    },
  }
}
