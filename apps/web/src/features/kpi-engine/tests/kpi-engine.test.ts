import assert from "node:assert/strict"
import test from "node:test"

import {
  KPIAlertEngine,
  KPIBenchmarkEngine,
  KPICalculatorEngine,
  KPIEngine,
  KPIForecastEngine,
  KPIPresenter,
  KPISLAEngine,
  KPITrendEngine,
  type KPIDefinition,
  type KPIResult,
  type KPITimePoint,
} from ".."

const now = new Date("2026-07-29T12:00:00.000Z")
const day = 86_400_000

const definition: KPIDefinition<Readonly<{ numerator: number; denominator: number }>> =
  Object.freeze({
    id: "test.ratio",
    name: "Indicador de teste",
    description: "Definição genérica usada somente para validar a infraestrutura.",
    valueKind: "percentage",
    precision: 1,
    favorableDirection: "increase",
    calculate: ({ numerator, denominator }) =>
      denominator === 0 ? null : (numerator / denominator) * 100,
  })

function result(value: number | null): KPIResult {
  return Object.freeze({
    definitionId: definition.id,
    value,
    availability: value === null ? "unavailable" : "available",
    calculatedAt: now,
  })
}

function series(...values: number[]): readonly KPITimePoint[] {
  return Object.freeze(values.map((value, index) => Object.freeze({
    occurredAt: new Date(now.getTime() + index * day),
    value,
  })))
}

test("Calculator Engine calcula valor disponível com relógio determinístico", () => {
  const calculator = new KPICalculatorEngine(() => now)
  const calculated = calculator.calculate(definition, { numerator: 3, denominator: 4 })

  assert.equal(calculated.value, 75)
  assert.equal(calculated.availability, "available")
  assert.equal(calculated.calculatedAt.toISOString(), now.toISOString())
  assert.equal(Object.isFrozen(calculated), true)
})

test("Calculator Engine representa ausência e rejeita valores não finitos", () => {
  const calculator = new KPICalculatorEngine(() => now)
  assert.equal(
    calculator.calculate(definition, { numerator: 1, denominator: 0 }).availability,
    "unavailable"
  )

  assert.throws(() => calculator.calculate(
    { ...definition, calculate: () => Number.NaN },
    { numerator: 1, denominator: 1 }
  ), RangeError)
})

test("SLA Engine avalia metas mínimas e máximas", () => {
  const engine = new KPISLAEngine()
  assert.equal(engine.evaluate(result(75), { target: 70, operator: "at-least" }).status, "met")
  assert.equal(engine.evaluate(result(75), { target: 70, operator: "at-most" }).status, "breached")
  assert.equal(engine.evaluate(result(null), { target: 70, operator: "at-least" }).status, "unavailable")
})

test("Trend Engine ordena a série sem mutá-la e calcula variação", () => {
  const source = [series(10, 15)[1]!, series(10, 15)[0]!]
  const trend = new KPITrendEngine().analyze(source)

  assert.equal(trend.direction, "up")
  assert.equal(trend.absoluteChange, 5)
  assert.equal(trend.percentageChange, 50)
  assert.equal(source[0]?.value, 15)
})

test("Trend Engine retorna indisponível sem dois pontos", () => {
  assert.equal(new KPITrendEngine().analyze(series(10)).direction, "unavailable")
})

test("Benchmark Engine compara valor atual e trata benchmark zero", () => {
  const engine = new KPIBenchmarkEngine()
  const comparison = engine.compare(result(75), { value: 50, label: "Referência" })

  assert.equal(comparison.comparison, "above")
  assert.equal(comparison.delta, 25)
  assert.equal(comparison.percentageDifference, 50)
  assert.equal(
    engine.compare(result(1), { value: 0, label: "Zero" }).percentageDifference,
    null
  )
})

test("Alert Engine avalia regras na ordem e bloqueia identificadores duplicados", () => {
  const engine = new KPIAlertEngine()
  const context = { result: result(75), sla: null, trend: null, benchmark: null }
  const rule = {
    id: "test.alert",
    severity: "warning" as const,
    message: "Alerta genérico.",
    matches: ({ result: current }: typeof context) => (current.value ?? 0) > 50,
  }

  assert.deepEqual(engine.evaluate(context, [rule]), [{
    id: "test.alert",
    severity: "warning",
    message: "Alerta genérico.",
  }])
  assert.throws(() => engine.evaluate(context, [rule, rule]))
})

test("Forecast Engine projeta tendência linear determinística", () => {
  const forecast = new KPIForecastEngine().forecast(series(10, 20, 30), {
    horizon: 2,
    intervalMilliseconds: day,
  })

  assert.equal(forecast.status, "available")
  assert.deepEqual(forecast.points.map((point) => point.value), [40, 50])
  assert.equal(forecast.points[0]?.occurredAt.toISOString(), "2026-08-01T12:00:00.000Z")
})

test("Forecast Engine exige histórico e opções válidas", () => {
  const engine = new KPIForecastEngine()
  assert.equal(engine.forecast(series(10), { horizon: 1, intervalMilliseconds: day }).status, "unavailable")
  assert.throws(() => engine.forecast(series(10, 20), { horizon: 0, intervalMilliseconds: day }), RangeError)
})

test("KPI Engine orquestra todas as análises sem conhecer domínio ou UI", () => {
  const analysis = new KPIEngine(
    new KPICalculatorEngine(() => now)
  ).analyze({
    definition,
    source: { numerator: 3, denominator: 4 },
    history: series(50, 75),
    sla: { target: 70, operator: "at-least" },
    benchmark: { value: 60, label: "Referência" },
    alertRules: [{
      id: "test.sla",
      severity: "info",
      message: "Meta atendida.",
      matches: (context) => context.sla?.status === "met",
    }],
    forecast: { horizon: 1, intervalMilliseconds: day },
  })

  assert.equal(analysis.result.value, 75)
  assert.equal(analysis.sla?.status, "met")
  assert.equal(analysis.trend?.direction, "up")
  assert.equal(analysis.benchmark?.comparison, "above")
  assert.equal(analysis.alerts.length, 1)
  assert.equal(analysis.forecast?.points[0]?.value, 100)
  assert.equal(Object.isFrozen(analysis), true)
})

test("KPI Presenter entrega somente ViewModel formatada e serializável", () => {
  const analysis = new KPIEngine(
    new KPICalculatorEngine(() => now)
  ).analyze({
    definition,
    source: { numerator: 3, denominator: 4 },
    history: series(50, 75),
    sla: { target: 70, operator: "at-least" },
  })
  const viewModel = new KPIPresenter().present(definition, analysis)

  assert.equal(viewModel.formattedValue, "75,0%")
  assert.equal(viewModel.sla?.statusLabel, "Meta atendida")
  assert.equal(viewModel.trend?.formattedPercentageChange, "+50%")
  assert.equal(viewModel.calculatedAt, now.toISOString())
  assert.equal(Object.isFrozen(viewModel), true)
  assert.doesNotThrow(() => JSON.stringify(viewModel))
})

test("KPI Presenter explicita resultado indisponível", () => {
  const analysis = new KPIEngine(
    new KPICalculatorEngine(() => now)
  ).analyze({
    definition,
    source: { numerator: 1, denominator: 0 },
  })

  const viewModel = new KPIPresenter({ unavailableLabel: "Sem dados" })
    .present(definition, analysis)
  assert.equal(viewModel.available, false)
  assert.equal(viewModel.formattedValue, "Sem dados")
})
