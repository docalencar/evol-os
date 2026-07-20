// Assessment Analytics
//
// Esta feature concentra toda a inteligência analítica das avaliações.
// Todos os dashboards, BI, indicadores e módulos executivos devem consumir
// esta API pública em vez de acessar diretamente o domínio Assessments.

export {}

//
// Types
//

export * from "./types/assessment-statistics"
export * from "./types/assessment-summary"

//
// Services
//

export * from "./services/calculate-average"
export * from "./services/calculate-standard-deviation"
export * from "./services/calculate-score-distribution"
export * from "./services/calculate-assessment-statistics"
export * from "./services/create-assessment-summary"

//
// Presenters
//

export * from "./presenters/assessment-cycle-results-presenter"
export * from "./presenters/present-assessment-statistics"

//
// Queries
//

export * from "./queries/get-assessment-cycle-statistics"
export * from "./queries/get-assessment-summary"
