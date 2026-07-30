import type { KPIDashboardDTO } from "../types"

export interface KPIDashboardSource { load(): Promise<KPIDashboardDTO> }
export class KPIDashboardQueryService {
  constructor(private readonly source: KPIDashboardSource) {}
  load(): Promise<KPIDashboardDTO> { return this.source.load() }
}
