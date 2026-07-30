import type { KPIDefinitionVersion } from "./kpi-definition-version"
import { KPIRegistryError } from "./kpi-registry-error"

export class KPIRegistry {
  private definitions: KPIDefinitionVersion[] = []

  register(versionedDefinition: KPIDefinitionVersion): void {
    this.registerMany([versionedDefinition])
  }

  registerMany(versionedDefinitions: readonly KPIDefinitionVersion[]): void {
    const candidates = versionedDefinitions.map(copyDefinitionVersion)
    const next = [...this.definitions]

    for (const candidate of candidates) {
      validateDefinitionVersion(candidate)
      assertNoDuplicate(next, candidate)
      assertNoOverlap(next, candidate)
      next.push(candidate)
    }

    this.definitions = sortDefinitions(next)
  }

  getById(definitionId: string, version?: number): KPIDefinitionVersion {
    const matches = this.definitions.filter((item) =>
      item.definitionId === definitionId &&
      (version === undefined || item.version === version)
    )
    return copyDefinitionVersion(requireDefinition(matches.at(-1)))
  }

  getByKey(key: string, version?: number): KPIDefinitionVersion {
    const matches = this.definitions.filter((item) =>
      item.key === key && (version === undefined || item.version === version)
    )
    return copyDefinitionVersion(requireDefinition(matches.at(-1)))
  }

  getActiveByKey(key: string, at?: Date): KPIDefinitionVersion {
    const timestamp = at?.getTime()
    const matches = this.definitions.filter((item) =>
      item.key === key && item.active &&
      (timestamp === undefined
        ? item.effectiveUntil == null
        : item.effectiveFrom.getTime() <= timestamp &&
          (item.effectiveUntil == null || timestamp < item.effectiveUntil.getTime()))
    )

    if (matches.length === 0) {
      throw new KPIRegistryError(
        "ACTIVE_DEFINITION_NOT_FOUND",
        `Nenhuma definição ativa encontrada para ${key}.`
      )
    }
    if (matches.length > 1) {
      throw new KPIRegistryError(
        "MULTIPLE_ACTIVE_DEFINITIONS",
        `Mais de uma definição ativa encontrada para ${key}.`
      )
    }
    return copyDefinitionVersion(matches[0]!)
  }

  hasKey(key: string): boolean {
    return this.definitions.some((item) => item.key === key)
  }

  hasId(definitionId: string): boolean {
    return this.definitions.some((item) => item.definitionId === definitionId)
  }

  list(): readonly KPIDefinitionVersion[] {
    return Object.freeze(this.definitions.map(copyDefinitionVersion))
  }

  listByOwnerModule(ownerModule: string): readonly KPIDefinitionVersion[] {
    return Object.freeze(this.definitions
      .filter((item) => item.definition.ownerModule === ownerModule)
      .map(copyDefinitionVersion))
  }

  listByCategory(category: string): readonly KPIDefinitionVersion[] {
    return Object.freeze(this.definitions
      .filter((item) => item.definition.category === category)
      .map(copyDefinitionVersion))
  }

  listVersionsByKey(key: string): readonly KPIDefinitionVersion[] {
    return Object.freeze(this.definitions
      .filter((item) => item.key === key)
      .map(copyDefinitionVersion))
  }
}

function validateDefinitionVersion(item: KPIDefinitionVersion): void {
  if (!Number.isInteger(item.version) || item.version <= 0 ||
      item.key.trim() === "" || item.definitionId.trim() === "") {
    throw new KPIRegistryError(
      "INVALID_DEFINITION_VERSION",
      "Versão, key e definitionId devem ser válidos."
    )
  }
  if (!Number.isFinite(item.effectiveFrom.getTime()) ||
      (item.effectiveUntil != null && !Number.isFinite(item.effectiveUntil.getTime()))) {
    throw new KPIRegistryError("INVALID_EFFECTIVE_PERIOD", "Período de vigência inválido.")
  }
  if (item.effectiveUntil != null &&
      item.effectiveUntil.getTime() < item.effectiveFrom.getTime()) {
    throw new KPIRegistryError("INVALID_EFFECTIVE_PERIOD", "O fim da vigência antecede seu início.")
  }
  if (item.definition.id !== item.definitionId) {
    throw new KPIRegistryError("DEFINITION_ID_MISMATCH", "O ID da definição não coincide com a versão.")
  }
  if (item.definition.key !== undefined && item.definition.key !== item.key) {
    throw new KPIRegistryError("DEFINITION_KEY_MISMATCH", "A key da definição não coincide com a versão.")
  }
}

function assertNoDuplicate(
  definitions: readonly KPIDefinitionVersion[],
  candidate: KPIDefinitionVersion
): void {
  if (definitions.some((item) =>
    item.definitionId === candidate.definitionId && item.version === candidate.version)) {
    throw new KPIRegistryError("DUPLICATE_DEFINITION_ID_VERSION", "ID e versão já registrados.")
  }
  if (definitions.some((item) =>
    item.key === candidate.key && item.version === candidate.version)) {
    throw new KPIRegistryError("DUPLICATE_DEFINITION_KEY_VERSION", "Key e versão já registradas.")
  }
}

function assertNoOverlap(
  definitions: readonly KPIDefinitionVersion[],
  candidate: KPIDefinitionVersion
): void {
  const overlapping = definitions.find((item) =>
    item.key === candidate.key && periodsOverlap(item, candidate))
  if (!overlapping) return

  if (overlapping.active && candidate.active) {
    throw new KPIRegistryError("MULTIPLE_ACTIVE_DEFINITIONS", "Duas definições ativas possuem vigência simultânea.")
  }
  throw new KPIRegistryError("OVERLAPPING_DEFINITION_PERIOD", "Versões da mesma key possuem períodos sobrepostos.")
}

function periodsOverlap(left: KPIDefinitionVersion, right: KPIDefinitionVersion): boolean {
  const leftEnd = left.effectiveUntil?.getTime() ?? Number.POSITIVE_INFINITY
  const rightEnd = right.effectiveUntil?.getTime() ?? Number.POSITIVE_INFINITY
  return left.effectiveFrom.getTime() < rightEnd && right.effectiveFrom.getTime() < leftEnd
}

function requireDefinition(value: KPIDefinitionVersion | undefined): KPIDefinitionVersion {
  if (!value) {
    throw new KPIRegistryError("DEFINITION_NOT_FOUND", "Definição de KPI não encontrada.")
  }
  return value
}

function sortDefinitions(items: readonly KPIDefinitionVersion[]): KPIDefinitionVersion[] {
  return [...items].sort((left, right) =>
    left.key.localeCompare(right.key) || left.version - right.version ||
    left.definitionId.localeCompare(right.definitionId))
}

export function copyDefinitionVersion(item: KPIDefinitionVersion): KPIDefinitionVersion {
  return Object.freeze({
    ...item,
    effectiveFrom: new Date(item.effectiveFrom.getTime()),
    effectiveUntil: item.effectiveUntil == null
      ? item.effectiveUntil
      : new Date(item.effectiveUntil.getTime()),
    definition: Object.freeze({
      ...item.definition,
      thresholds: item.definition.thresholds
        ? Object.freeze(item.definition.thresholds.map((threshold) => Object.freeze({ ...threshold })))
        : undefined,
      features: item.definition.features
        ? Object.freeze({ ...item.definition.features })
        : undefined,
    }),
  })
}
