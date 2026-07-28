import type { ChangeSet } from "../../types/planning-contracts"

// Ordenação canônica e determinística dos change sets: por versão e, em empate,
// pelo identificador. É a fonte única usada pelo ProjectionEngine e pela camada
// de execução de cenários, garantindo a mesma ordem em ambos.
export function orderChangeSets(
  changeSets: readonly ChangeSet[]
): readonly ChangeSet[] {
  return Object.freeze(
    [...changeSets].sort(
      (left, right) =>
        left.version - right.version ||
        left.id.localeCompare(right.id)
    )
  )
}
