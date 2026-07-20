// Executive Analytics Dashboard
//
// Este módulo concentrará os indicadores executivos consolidados do Evol OS.
//
// Responsabilidades futuras:
// - KPIs organizacionais;
// - indicadores de pessoas e estrutura;
// - indicadores de avaliações;
// - comparativos entre áreas;
// - tendências entre períodos;
// - riscos e prioridades executivas.
//
// A implementação será construída incrementalmente, mantendo separadas:
// - coleta de dados;
// - cálculos;
// - apresentação;
// - interface.

export {}

export * from "./types/executive-dashboard-summary"
export * from "./services/create-executive-dashboard-summary"

export * from "./queries/get-executive-dashboard-summary"
