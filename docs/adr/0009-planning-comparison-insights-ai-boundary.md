# ADR 0009 — Planning Comparison, Insights and AI Boundary

## Status

Accepted

## Context

Comparar cenários, interpretar impactos e explicar resultados são responsabilidades
distintas. Misturá-las produziria regras duplicadas e resultados dependentes de IA.

## Decision

Scenario Comparison compara duas organizações projetadas por ID e produz um
`ScenarioComparisonResult` determinístico. Planning Insights recebe exclusivamente
esse resultado e aplica regras determinísticas para produzir KPIs, warnings,
oportunidades, riscos e recomendações estruturadas.

Presentation e um futuro adapter de IA são consumidores. Eles não recalculam
diferenças, métricas ou regras. IA pode explicar ou resumir Insights, mas não é a
fonte de verdade das decisões determinísticas.

## Consequences

- Comparison não depende de banco, RPC ou IA.
- Planning Insights não depende de Snapshot ou Projection Engine.
- IDs de insights são estáveis e independentes da mensagem apresentada.
- UI, APIs e IA podem consumir o mesmo resultado estruturado.
- Novas regras de risco pertencem a Planning Insights e exigem testes determinísticos.

## Rejected alternatives

- Calcular diferenças novamente na UI ou em prompts.
- Gerar warnings diretamente na Projection Engine.
- Usar respostas de IA como contrato de análise organizacional.
