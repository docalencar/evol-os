export interface PlanningUnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}

export class SimplePlanningUnitOfWork
  implements PlanningUnitOfWork
{
  private active = false

  async begin() {
    if (this.active) {
      throw new Error("Já existe uma unidade de trabalho ativa.")
    }
    this.active = true
  }

  async commit() {
    if (!this.active) {
      throw new Error("Não existe unidade de trabalho ativa.")
    }
    this.active = false
  }

  async rollback() {
    if (!this.active) {
      throw new Error("Não existe unidade de trabalho ativa.")
    }
    this.active = false
  }

  get isActive() {
    return this.active
  }
}
