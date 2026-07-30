import { KPIRegistry, KPIRegistryError, type KPIDefinitionVersion } from "../registry"
import type { KPIDefinitionRepository } from "./kpi-definition-repository"

export class InMemoryKPIDefinitionRepository implements KPIDefinitionRepository {
  private readonly registry = new KPIRegistry()

  async save(definition: KPIDefinitionVersion): Promise<void> {
    this.registry.register(definition)
  }

  async saveMany(definitions: readonly KPIDefinitionVersion[]): Promise<void> {
    this.registry.registerMany(definitions)
  }

  async findByIdAndVersion(
    definitionId: string,
    version: number
  ): Promise<KPIDefinitionVersion | null> {
    try {
      return this.registry.getById(definitionId, version)
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async findByKeyAndVersion(
    key: string,
    version: number
  ): Promise<KPIDefinitionVersion | null> {
    try {
      return this.registry.getByKey(key, version)
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async findActiveByKey(key: string, at: Date): Promise<KPIDefinitionVersion | null> {
    try {
      return this.registry.getActiveByKey(key, at)
    } catch (error) {
      if (error instanceof KPIRegistryError &&
          error.code === "ACTIVE_DEFINITION_NOT_FOUND") return null
      throw error
    }
  }

  async list(): Promise<readonly KPIDefinitionVersion[]> {
    return this.registry.list()
  }

  async listByOwnerModule(ownerModule: string): Promise<readonly KPIDefinitionVersion[]> {
    return this.registry.listByOwnerModule(ownerModule)
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof KPIRegistryError && error.code === "DEFINITION_NOT_FOUND"
}
