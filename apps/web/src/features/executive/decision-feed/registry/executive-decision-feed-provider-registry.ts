import type {
  DecisionFeedProvider,
} from "../aggregators"

export class ExecutiveDecisionFeedProviderRegistry {
  private readonly providers =
    new Map<string, DecisionFeedProvider>()

  register(
    provider: DecisionFeedProvider,
  ): this {
    const key = provider.key.trim()

    if (!key) {
      throw new Error(
        "A chave do provider do Feed de Decisões não pode estar vazia.",
      )
    }

    if (this.providers.has(key)) {
      throw new Error(
        `Provider duplicado no Feed de Decisões: ${key}`,
      )
    }

    this.providers.set(key, provider)

    return this
  }

  registerMany(
    providers: readonly DecisionFeedProvider[],
  ): this {
    for (const provider of providers) {
      this.register(provider)
    }

    return this
  }

  list(): readonly DecisionFeedProvider[] {
    return Object.freeze([
      ...this.providers.values(),
    ])
  }
}
