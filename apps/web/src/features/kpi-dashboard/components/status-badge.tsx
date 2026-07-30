import { Badge } from "@/components/ui/badge"
import type { DashboardStatus } from "../types"

const styles: Readonly<Record<DashboardStatus, string>> = Object.freeze({ healthy: "bg-emerald-50 text-emerald-700",
  attention: "bg-amber-50 text-amber-700", critical: "bg-red-50 text-red-700",
  unavailable: "bg-slate-100 text-slate-600" })
export function StatusBadge({ status, label }: { status: DashboardStatus; label: string }) {
  return <Badge className={styles[status]}>{label}</Badge>
}
