import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIEvaluationRepository, KPIEngine, KPIEvaluationApplicationService,
  KPIEvaluationService, KPICalculatorEngine, KPIRegistry,
} from "../.."
import { context, january, version } from "../../tests/kpi-test-fixtures"
import {
  createKPIExecutionPlatform, InMemoryKPIExecutionPolicy,
  InMemoryKPIExecutionTelemetry, KPIExecutionRequestValidator,
  SingleExecutionExecutor, type KPIExecutionRequest,
} from ".."

test("pipeline executa, persiste e registra telemetria", async () => {
  const fixture = createFixture()
  const result = await fixture.platform.execute(request("key-1"))
  assert.equal(result.status, "succeeded")
  assert.equal((await fixture.repository.listByCompany({ companyId: "company-1" })).length, 1)
  assert.deepEqual(fixture.telemetry.events().map((event) => event.kind), ["started", "completed"])
  assert.equal(fixture.telemetry.events()[1]?.persisted, 1)
})

test("policy impede duplicidade e permite reexecução explícita", async () => {
  const fixture = createFixture()
  assert.equal((await fixture.platform.execute(request("same"))).status, "succeeded")
  assert.equal((await fixture.platform.execute(request("same"))).status, "duplicate")
  assert.equal((await fixture.platform.execute({ ...request("same"), allowReexecution: true })).status, "succeeded")
  assert.equal(fixture.telemetry.events().some((event) => event.kind === "duplicate"), true)
})

test("policy trata execução concorrente, falha e interrupção", () => {
  const policy = new InMemoryKPIExecutionPolicy()
  assert.equal(policy.begin("running", false).allowed, true)
  assert.equal(policy.begin("running", false).reason, "in-progress")
  policy.fail("running")
  assert.equal(policy.begin("running", false).allowed, true)
  policy.interrupt("stopped")
  assert.equal(policy.begin("stopped", false).reason, "interrupted")
})

test("validador rejeita requests inválidos e duplicidade no batch", () => {
  const validator = new KPIExecutionRequestValidator()
  assert.throws(() => validator.validate({ ...request("x"), providerKey: "" }), /INVALID/)
  assert.throws(() => validator.validateBatch({ idempotencyKey: "batch", requests: [request("x"), request("x")] }), /DUPLICATE/)
})

test("single executor converte falha de avaliação em resultado", async () => {
  const fixture = createFixture()
  const invalid = { ...request("failure"), evaluation: { ...request("failure").evaluation,
    context: context({ definitionKey: "missing" }) } }
  const result = await fixture.platform.execute(invalid)
  assert.equal(result.status, "failed")
  assert.match(result.error ?? "", /Falha ao calcular|encontrada/)
})

test("batch executa múltiplos KPIs e agrega telemetria", async () => {
  const fixture = createFixture()
  const result = await fixture.platform.executeBatch({
    idempotencyKey: "batch-1", requests: [request("one"), request("two")],
  })
  assert.equal(result.status, "succeeded")
  assert.equal(result.succeeded, 2)
  assert.equal(result.persisted, 2)
  assert.equal(fixture.telemetry.events()[1]?.kpiCount, 2)
})

test("batch interrompe com segurança após falha", async () => {
  const fixture = createFixture()
  const result = await fixture.platform.executeBatch({ idempotencyKey: "batch-stop", stopOnFailure: true,
    requests: [{ ...request("bad"), providerKey: "unknown" }, request("not-run")] })
  assert.equal(result.status, "failed")
  assert.equal(result.results.length, 1)
})

test("factory aceita múltiplos providers e executor não encontrado falha", async () => {
  const fixture = createFixture(["provider-a", "provider-b"])
  assert.equal((await fixture.platform.execute({ ...request("a"), providerKey: "provider-a" })).status, "succeeded")
  assert.equal((await fixture.platform.execute({ ...request("b"), providerKey: "provider-b" })).status, "succeeded")
  assert.equal((await fixture.platform.execute({ ...request("c"), providerKey: "provider-c" })).status, "failed")
})

function request(idempotencyKey: string): KPIExecutionRequest {
  return { providerKey: "test", idempotencyKey,
    evaluation: { context: context({ definitionVersion: 1 }), source: { value: 10 } } }
}

function createFixture(keys: readonly string[] = ["test"]) {
  const registry = new KPIRegistry()
  registry.register(version())
  const repository = new InMemoryKPIEvaluationRepository()
  let sequence = 0
  const evaluations = new KPIEvaluationApplicationService(
    new KPIEvaluationService(registry, new KPIEngine(new KPICalculatorEngine(() => january)),
      { now: () => january }, { generate: () => `evaluation-${++sequence}` }), repository)
  const telemetry = new InMemoryKPIExecutionTelemetry()
  const platform = createKPIExecutionPlatform({
    executors: keys.map((key) => new SingleExecutionExecutor(key, evaluations)),
    clock: { now: () => january }, idGenerator: { generate: () => `execution-${++sequence}` }, telemetry,
  })
  return { platform, repository, telemetry }
}
