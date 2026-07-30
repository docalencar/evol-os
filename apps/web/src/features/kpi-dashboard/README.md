# KPI Executive Dashboard

Camada de produto e leitura do KPI Engine. O fluxo é unidirecional:

```text
UI → KPIDashboardApplicationService → KPIDashboardQueryService
   → fontes públicas de leitura → DTO → KPIDashboardPresenter → ViewModel
```

Componentes React recebem apenas ViewModels. Eles não acessam repositories, não
executam KPIs e não chamam Runtime, Scheduler ou Operational Gateway.

## Painéis

- Executive Summary: nove métricas corporativas.
- Operational Health: runtime, scheduler, gateway, workers, execuções e recovery.
- Execution KPIs: estados, duração, throughput e taxa de sucesso.
- Planning KPIs: cenários, impacto financeiro, headcount, payroll e departamentos.
- Workers e Timeline: tabelas e histórico cronológico de eventos operacionais.
- Alerts Preview e AI Insights: preview determinístico e placeholder sem IA.

`KPIDashboardPresenter` concentra formatação de moeda, percentuais, datas, status e
tendências. Loading, empty states, cards, badges e tabelas reutilizam o Design
System. A renderização é server-side; não há estado cliente nem queries duplicadas.

## Limitações

A composição atual expõe o total de colaboradores pela query pública existente.
Os demais cards mostram indisponibilidade até que Query Services server-side para
histórico KPI, Planning e snapshots operacionais sejam conectados. Nenhum valor é
estimado ou calculado pela interface. Gráficos históricos e IA permanecem fora do
escopo desta PR.
