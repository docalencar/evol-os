export interface SnapshotVersionAllocator {
  allocate(workspaceId: string): Promise<number>
}

export class InMemorySnapshotVersionAllocator
  implements SnapshotVersionAllocator
{
  private readonly versions: Map<string, number>

  constructor(seed: ReadonlyMap<string, number> = new Map()) {
    this.versions = new Map(seed)
  }

  async allocate(workspaceId: string): Promise<number> {
    const nextVersion = (this.versions.get(workspaceId) ?? 0) + 1
    this.versions.set(workspaceId, nextVersion)
    return nextVersion
  }
}
