import {
  ProductPriorityCard,
  type ProductPriority,
} from "@/components/product"

type AssessmentPriorityCardProps = {
  priority: ProductPriority | null
}

export function AssessmentPriorityCard({
  priority,
}: AssessmentPriorityCardProps) {
  if (!priority) {
    return null
  }

  return (
    <ProductPriorityCard priority={priority} />
  )
}
