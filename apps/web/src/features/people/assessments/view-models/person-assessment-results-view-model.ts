/**
 * View model de "Últimas avaliações" na página de uma Pessoa.
 *
 * Espelha exatamente o contrato minimizado da fronteira 0118: nada aqui carrega
 * identidade de avaliador, Answers, Questions, comentários ou score bruto. Se um
 * campo novo aparecer neste tipo, ele precisa existir nas 10 colunas do RPC.
 */
export type PersonAssessmentResultItemViewModel = Readonly<{
  responseId: string
  cycleId: string
  cycleName: string
  modelName: string
  perspectiveLabel: string
  scoreLabel: string
  /** Preenchido só quando o Result é qualitativo, para explicar a ausência de nota. */
  scoreDescription: string | null
  statusLabel: string
  dateLabel: string
  href: string
}>

export type PersonAssessmentResultsViewModel = Readonly<{
  items: ReadonlyArray<PersonAssessmentResultItemViewModel>
  /** Total de Results oficiais devolvidos pela fronteira, antes do corte de exibição. */
  totalCount: number
  /** true quando `totalCount` excede o limite exibido. */
  isTruncated: boolean
  truncationLabel: string | null
  isEmpty: boolean
}>
