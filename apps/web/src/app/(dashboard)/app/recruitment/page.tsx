import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyState } from "@/components/empty-state/empty-state"
import { PageHeader } from "@/components/shared/page-header"

export default function RecruitmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Gerencie vagas, aprovações e processos seletivos."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vagas abertas" value={0} />
        <StatCard label="Pendentes" value={0} />
        <StatCard label="Em andamento" value={0} />
        <StatCard label="Contratações" value={0} />
      </div>

      <EmptyState
        title="Nenhuma vaga cadastrada."
        description="Crie sua primeira vaga para iniciar o recrutamento."
        actionLabel="Nova vaga"
      />
    </div>
  )
}
