import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileStack,
  GitBranch,
  Layers3,
  Sparkles,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import {
  PlanningScenarioCreateDialog,
  PlanningWorkspaceCreateButton,
} from "@/features/organization-planning"
import {
  getPlanningHome,
  type PlanningHomeScenario,
} from "@/features/organization-planning/queries/get-planning-home"
import type {
  PlanningScenarioStatus,
} from "@/features/organization-planning/types/planning-contracts"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

const STATUS_LABELS: Record<
  PlanningScenarioStatus,
  string
> = {
  draft: "Rascunho",
  submitted: "Em aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
  archived: "Arquivado",
}

const STATUS_CLASSES: Record<
  PlanningScenarioStatus,
  string
> = {
  draft:
    "border-slate-200 bg-slate-50 text-slate-700",
  submitted:
    "border-amber-200 bg-amber-50 text-amber-700",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected:
    "border-red-200 bg-red-50 text-red-700",
  published:
    "border-blue-200 bg-blue-50 text-blue-700",
  archived:
    "border-zinc-200 bg-zinc-100 text-zinc-600",
}

function formatDate(value: string | null) {
  if (!value) {
    return "Ainda não disponível"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description: string
  icon: typeof Layers3
}) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {description}
      </p>
    </article>
  )
}

function PlanningStatusBadge({
  status,
}: {
  status: PlanningScenarioStatus
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "text-xs font-medium",
        STATUS_CLASSES[status],
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function ScenarioRow({
  scenario,
}: {
  scenario: PlanningHomeScenario
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-4">
        <div className="max-w-md">
          <p className="font-medium">
            {scenario.name}
          </p>

          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {scenario.description ??
              "Nenhuma descrição informada."}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        <PlanningStatusBadge
          status={scenario.status}
        />
      </td>

      <td className="px-4 py-4 text-sm text-muted-foreground">
        Snapshot v{scenario.version}
      </td>

      <td className="px-4 py-4 text-sm text-muted-foreground">
        {formatDate(scenario.updatedAt)}
      </td>

      <td className="px-4 py-4 text-right">
        <span
          className={[
            "inline-flex cursor-not-allowed items-center gap-2",
            "rounded-md border px-3 py-2 text-sm font-medium",
            "text-muted-foreground opacity-60",
          ].join(" ")}
          title="A abertura do cenário será implementada na próxima etapa."
        >
          Abrir
          <ArrowRight className="h-4 w-4" />
        </span>
      </td>
    </tr>
  )
}

function EmptyWorkspace() {
  return (
    <section className="rounded-2xl border border-dashed bg-muted/20 p-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="rounded-2xl border bg-background p-3 shadow-sm">
          <Layers3 className="h-7 w-7 text-muted-foreground" />
        </div>

        <h2 className="mt-5 text-xl font-semibold">
          O planejamento organizacional ainda não foi
          iniciado
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          O workspace reúne snapshots e cenários para que
          alterações organizacionais sejam planejadas antes
          de afetarem a operação.
        </p>

        <PlanningWorkspaceCreateButton className="mt-6" />
      </div>
    </section>
  )
}

function EmptyScenarios() {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/30">
        <GitBranch className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="mt-4 font-semibold">
        Nenhum cenário criado
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        Crie um cenário para simular mudanças na estrutura
        sem alterar imediatamente a organização atual.
      </p>
    </div>
  )
}

export default async function OrganizationPage() {
  const { companyId, companyName } =
    await getCurrentCompanyContext()

  const planning =
    await getPlanningHome(companyId)

  const workspaceUpdatedAt =
    planning.workspace?.updatedAt ?? null

  const snapshotPublishedAt =
    planning.currentSnapshot?.publishedAt ?? null

  const canCreateScenario =
    Boolean(planning.workspace) &&
    Boolean(planning.currentSnapshot)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planejamento Organizacional"
        description="Planeje mudanças, avalie cenários e publique somente quando a estrutura estiver pronta."
        actions={
          canCreateScenario &&
          planning.workspace &&
          planning.currentSnapshot ? (
            <PlanningScenarioCreateDialog
              workspaceId={planning.workspace.id}
              baseSnapshotId={
                planning.currentSnapshot.id
              }
            />
          ) : null
        }
      />

      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Ambiente seguro de simulação
            </div>

            <h2 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
              Evolua a estrutura da {companyName} com
              decisões planejadas.
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Trabalhe com cenários separados da operação
              atual, acompanhe versões e mantenha um
              histórico confiável das estruturas publicadas.
            </p>
          </div>

          <div className="rounded-2xl border bg-background/80 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado atual
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="font-medium">
                  {planning.currentSnapshot
                    ? `Snapshot v${planning.currentSnapshot.version}`
                    : "Sem snapshot publicado"}
                </p>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  {planning.currentSnapshot
                    ? formatDate(
                        snapshotPublishedAt
                      )
                    : "Inicie o workspace para criar a base."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!planning.workspace ? (
        <EmptyWorkspace />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Snapshot atual"
              value={
                planning.currentSnapshot
                  ? `v${planning.currentSnapshot.version}`
                  : "—"
              }
              description={
                planning.currentSnapshot
                  ? `Publicado em ${formatDate(
                      snapshotPublishedAt
                    )}`
                  : "Nenhuma estrutura publicada."
              }
              icon={Layers3}
            />

            <MetricCard
              title="Cenários ativos"
              value={
                planning.metrics.activeScenarios
              }
              description="Rascunhos e cenários em análise."
              icon={GitBranch}
            />

            <MetricCard
              title="Em aprovação"
              value={
                planning.metrics
                  .pendingApprovalScenarios
              }
              description="Cenários aguardando uma decisão."
              icon={Clock3}
            />

            <MetricCard
              title="Cenários publicados"
              value={
                planning.metrics
                  .publishedScenarios
              }
              description="Planejamentos convertidos em snapshots."
              icon={FileStack}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Cenários
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe os planejamentos criados a
                  partir da estrutura publicada.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Workspace atualizado em{" "}
                {formatDate(workspaceUpdatedAt)}
              </div>
            </div>

            {planning.scenarios.length === 0 ? (
              <EmptyScenarios />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cenário
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Versão
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Atualização
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Ação
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {planning.scenarios.map(
                      (scenario) => (
                        <ScenarioRow
                          key={scenario.id}
                          scenario={scenario}
                        />
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
