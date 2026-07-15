import { Badge } from "@/components/ui/badge"

type AssessmentStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "archived"

const labels: Record<AssessmentStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  active: "Em andamento",
  completed: "Concluída",
  archived: "Arquivada",
}

const classNames: Record<AssessmentStatus, string> = {
  draft:
    "border border-border bg-background text-muted-foreground",
  scheduled:
    "border border-transparent bg-muted text-muted-foreground",
  active:
    "border border-transparent bg-primary text-primary-foreground",
  completed:
    "border border-transparent bg-muted text-foreground",
  archived:
    "border border-border bg-background text-muted-foreground",
}

type AssessmentStatusBadgeProps = {
  status: AssessmentStatus
}

export function AssessmentStatusBadge({
  status,
}: AssessmentStatusBadgeProps) {
  return (
    <Badge className={classNames[status]}>
      {labels[status]}
    </Badge>
  )
}
