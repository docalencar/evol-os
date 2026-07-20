// Assessment Analytics
//
// Esta feature concentrará toda a inteligência analítica das avaliações.
// Nesta primeira etapa ela funciona como ponto de entrada da nova arquitetura.
// Os próximos PRs moverão gradualmente os serviços, presenters, queries,
// componentes e tipos para este módulo.

export {}

export * from "./types/assessment-statistics"

export * from "./services/calculate-average"
export * from "./services/calculate-standard-deviation"
export * from "./services/calculate-score-distribution"
export * from "./services/calculate-assessment-statistics"

export * from "./presenters/assessment-cycle-results-presenter"
export * from "./presenters/present-assessment-statistics"

export * from "./queries/get-assessment-cycle-statistics"
