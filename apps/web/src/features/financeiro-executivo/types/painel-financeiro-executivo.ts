export type EntradaPainelFinanceiroExecutivo = Readonly<{
  folhaAtual: number
  folhaPlanejada: number
  quadroAtual: number
  quadroAprovado: number
  quadroPlanejado: number
}>

export type PainelFinanceiroExecutivo = Readonly<{
  folha: Readonly<{
    atual: number
    planejada: number
    variacaoAbsoluta: number
    variacaoPercentual: number
  }>

  quadro: Readonly<{
    atual: number
    aprovado: number
    planejado: number
    diferencaParaAprovado: number
    diferencaParaPlanejado: number
  }>
}>

export type PainelFinanceiroExecutivoApresentado = Readonly<{
  folha: Readonly<{
    atual: string
    planejada: string
    variacaoAbsoluta: string
    variacaoPercentual: string
  }>

  quadro: Readonly<{
    atual: string
    aprovado: string
    planejado: string
    diferencaParaAprovado: string
    diferencaParaPlanejado: string
  }>
}>
