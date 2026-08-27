/**
 * View model do agregado ANÔNIMO de feedback `direct_report` (subordinados) de
 * UMA Pessoa, por Cycle — camada de apresentação da fronteira 0119.
 *
 * Espelha exatamente o contrato minimizado de 7 colunas do RPC e o reduz ainda
 * mais: cada item carrega só o necessário para renderizar um ciclo. NENHUM campo
 * aqui pode reintroduzir cardinalidade ou identidade — sem `respondentCount`,
 * `scoredCount`, `responseId`, `evaluatorId`, `rawScore`, min/max, distribuição,
 * timestamps ou status individuais. Se um campo novo aparecer neste tipo, ele
 * precisa existir nas 7 colunas do RPC E não permitir reidentificação.
 *
 * Os três `kind` são a máquina de estados PÚBLICA (PD-022 / ADR-0018):
 *  - `quantitative`: score agregado exibível;
 *  - `qualitative`:  há feedback agregado, sem nota quantitativa;
 *  - `suppressed`:   não há dados suficientes para exibição anônima.
 *
 * Os dois casos internos de supressão — A (`eligible < 4`) e D (`eligible >= 4`
 * com `scored ∈ {1,2,3}`) — chegam idênticos do banco e produzem exatamente o
 * MESMO item `suppressed` aqui; nada distingue A de D nesta camada.
 */
type PersonDirectReportAggregateItemBase = Readonly<{
  cycleId: string
  cycleName: string
  modelName: string
  dateLabel: string
}>

export type PersonDirectReportAggregateItemViewModel =
  | (PersonDirectReportAggregateItemBase & Readonly<{ kind: "quantitative"; scoreLabel: string }>)
  | (PersonDirectReportAggregateItemBase & Readonly<{ kind: "qualitative"; label: string }>)
  | (PersonDirectReportAggregateItemBase & Readonly<{ kind: "suppressed"; label: string }>)

export type PersonDirectReportAggregateViewModel = Readonly<{
  items: ReadonlyArray<PersonDirectReportAggregateItemViewModel>
  isEmpty: boolean
}>
