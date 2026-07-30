import type { KPIDefinitionVersion } from "../registry"

export interface KPIDefinitionRepository {
  save(definition: KPIDefinitionVersion): Promise<void>
  saveMany(definitions: readonly KPIDefinitionVersion[]): Promise<void>
  findByIdAndVersion(definitionId: string, version: number): Promise<KPIDefinitionVersion | null>
  findByKeyAndVersion(key: string, version: number): Promise<KPIDefinitionVersion | null>
  findActiveByKey(key: string, at: Date): Promise<KPIDefinitionVersion | null>
  list(): Promise<readonly KPIDefinitionVersion[]>
  listByOwnerModule(ownerModule: string): Promise<readonly KPIDefinitionVersion[]>
}
