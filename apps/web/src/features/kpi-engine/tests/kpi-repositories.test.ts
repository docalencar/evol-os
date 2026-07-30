import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIDefinitionRepository,
  InMemoryKPIEvaluationRepository,
} from ".."
import { companyId, evaluation, february, january, version } from "./kpi-test-fixtures"

test("definition repository salva, busca por ID/key e lista", async () => {
  const repository = new InMemoryKPIDefinitionRepository()
  await repository.save(version())
  assert.equal((await repository.findByIdAndVersion("definition-1", 1))?.key, "test.metric")
  assert.equal((await repository.findByKeyAndVersion("test.metric", 1))?.definitionId, "definition-1")
  assert.equal((await repository.list()).length, 1)
})

test("definition repository salva várias, resolve ativa e lista owner", async () => {
  const repository = new InMemoryKPIDefinitionRepository()
  await repository.saveMany([
    version({ effectiveUntil: february }),
    version({ version: 2, effectiveFrom: february }),
  ])
  assert.equal((await repository.findActiveByKey("test.metric", january))?.version, 1)
  assert.equal((await repository.listByOwnerModule("test-module")).length, 2)
})

test("evaluation repository salva e busca com companyId", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  await repository.save(evaluation())
  assert.equal((await repository.findById(companyId, "evaluation-1"))?.id, "evaluation-1")
  assert.equal(await repository.findById("other-company", "evaluation-1"), null)
})

test("lista avaliações por empresa com isolamento", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  await repository.save(evaluation({ id: "a" }))
  await repository.save(evaluation({ id: "b", company: "other-company" }))
  assert.deepEqual((await repository.listByCompany({ companyId })).map((item) => item.id), ["a"])
})

test("lista por definição, versão e período", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  await repository.save(evaluation({ id: "jan", evaluatedAt: january }))
  await repository.save(evaluation({ id: "feb", evaluatedAt: february }))
  const values = await repository.listByDefinition({
    companyId,
    definitionKey: "test.metric",
    definitionVersion: 1,
    periodStart: february,
    periodEnd: february,
  })
  assert.deepEqual(values.map((item) => item.id), ["feb"])
})

test("lista por escopo e definitionKey", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  await repository.save(evaluation({ id: "team", scopeType: "team", scopeId: "team-1" }))
  await repository.save(evaluation({ id: "company" }))
  const values = await repository.listByScope({
    companyId, scopeType: "team", scopeId: "team-1", definitionKey: "test.metric",
  })
  assert.deepEqual(values.map((item) => item.id), ["team"])
})

test("aplica ordenação determinística, limit e offset", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  await repository.save(evaluation({ id: "b", createdAt: february }))
  await repository.save(evaluation({ id: "a", createdAt: february }))
  await repository.save(evaluation({ id: "old", createdAt: january }))
  assert.deepEqual(
    (await repository.listByCompany({ companyId, limit: 1, offset: 1 })).map((item) => item.id),
    ["b"]
  )
})

test("repository copia avaliação no save e no retorno", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  const source = evaluation()
  await repository.save(source)
  source.createdAt.setUTCFullYear(2030)
  source.context.periodStart.setUTCFullYear(2030)
  const first = await repository.findById(companyId, source.id)
  first?.createdAt.setUTCFullYear(2040)
  const second = await repository.findById(companyId, source.id)
  assert.equal(second?.createdAt.toISOString(), january.toISOString())
  assert.equal(second?.context.periodStart.toISOString(), january.toISOString())
})

test("metadata não vaza por referência", async () => {
  const repository = new InMemoryKPIEvaluationRepository()
  await repository.save(evaluation())
  const stored = await repository.findById(companyId, "evaluation-1")
  assert.equal(Object.isFrozen(stored?.context.metadata), true)
  assert.notEqual(stored?.context.metadata, (await repository.findById(companyId, "evaluation-1"))?.context.metadata)
})
