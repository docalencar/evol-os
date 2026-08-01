import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
} from "../types"

export interface DecisionFeedProvider {
  readonly key: string

  load(): Promise<DecisionFeedDTO>
}

export type DecisionFeedAggregationFailure = Readonly<{
  providerKey: string
  message: string
}>

export type DecisionFeedAggregationResult = Readonly<{
  feed: DecisionFeedDTO
  failures: readonly DecisionFeedAggregationFailure[]
}>

export class DecisionFeedAggregator {
  constructor(
    private readonly providers: readonly DecisionFeedProvider[],
  ) {
    assertUniqueProviderKeys(providers)
  }

  async aggregate(
    generatedAt: string,
  ): Promise<DecisionFeedAggregationResult> {
    const settled = await Promise.allSettled(
      this.providers.map(async (provider) => ({
        provider,
        feed: await provider.load(),
      })),
    )

    const items: DecisionFeedItemDTO[] = []
    const failures: DecisionFeedAggregationFailure[] = []

    settled.forEach((result, index) => {
      const provider = this.providers[index]

      if (!provider) {
        return
      }

      if (result.status === "fulfilled") {
        items.push(...result.value.feed.items)
        return
      }

      failures.push(
        Object.freeze({
          providerKey: provider.key,
          message: getErrorMessage(result.reason),
        }),
      )
    })

    return Object.freeze({
      feed: Object.freeze({
        generatedAt,
        items: Object.freeze(deduplicateItems(items)),
      }),
      failures: Object.freeze(failures),
    })
  }
}

function assertUniqueProviderKeys(
  providers: readonly DecisionFeedProvider[],
): void {
  const keys = new Set<string>()

  for (const provider of providers) {
    const key = provider.key.trim()

    if (!key) {
      throw new Error(
        "Decision Feed provider key cannot be empty.",
      )
    }

    if (keys.has(key)) {
      throw new Error(
        `Duplicate Decision Feed provider key: ${key}`,
      )
    }

    keys.add(key)
  }
}

function deduplicateItems(
  items: readonly DecisionFeedItemDTO[],
): readonly DecisionFeedItemDTO[] {
  const uniqueItems = new Map<string, DecisionFeedItemDTO>()

  for (const item of items) {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item)
    }
  }

  return [...uniqueItems.values()]
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown Decision Feed provider failure."
}