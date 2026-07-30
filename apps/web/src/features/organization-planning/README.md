# Organization Planning

## KPI integration

`kpi/` conecta o estado determinístico produzido pelo Projection Engine ao KPI
Engine sem acessar banco, repositories ou UI. O mapper captura o estado base, o
estado projetado, o cenário e seus eventos em um `PlanningKPISource` imutável.

Cinco providers coesos calculam headcount, vagas/ocupação, payroll, estrutura e
impacto do cenário. A factory compõe providers extensíveis e cria as 14 definições
oficiais versionadas. `PlanningKPIService` registra essas definições no Registry,
gera o snapshot completo e delega cada avaliação ao
`KPIEvaluationApplicationService`, que mantém persistência e histórico fora deste
módulo.

O fluxo é: Projection Engine → mapper → providers → Registry → Evaluation Service
→ repository configurado pelo chamador. Providers são puros, determinísticos e
independentes de React e Supabase.
