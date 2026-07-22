export type TurnoverInput = {
  terminations: number
  headcountAtStart: number | null
  headcountAtEnd: number | null
}

export type TurnoverCalculation = {
  value: number | null
  unavailableReason: string | null
}

export function calculateTurnover({
  terminations,
  headcountAtStart,
  headcountAtEnd,
}: TurnoverInput): TurnoverCalculation {
  if (
    headcountAtStart === null ||
    headcountAtEnd === null
  ) {
    return {
      value: null,
      unavailableReason:
        "Histórico de headcount do período ainda não disponível.",
    }
  }

  const averageHeadcount =
    (headcountAtStart + headcountAtEnd) / 2

  if (averageHeadcount <= 0) {
    return {
      value: null,
      unavailableReason:
        "Headcount médio precisa ser maior que zero.",
    }
  }

  return {
    value: (terminations / averageHeadcount) * 100,
    unavailableReason: null,
  }
}
