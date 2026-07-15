import type {
  AttentionItem,
  AttentionPriority,
} from "../types/attention-item"

const PRIORITY_ORDER: Record<AttentionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function createAttentionQueue(
  items: AttentionItem[]
): AttentionItem[] {
  return [...items].sort((left, right) => {
    return (
      PRIORITY_ORDER[left.priority] -
      PRIORITY_ORDER[right.priority]
    )
  })
}