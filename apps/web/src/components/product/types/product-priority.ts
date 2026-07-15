export type ProductPrioritySeverity =
  | "info"
  | "success"
  | "warning"
  | "danger"

export type ProductPriority = {
  title: string
  message: string
  severity: ProductPrioritySeverity
  actionLabel?: string
  href?: string
}
