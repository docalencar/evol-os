import type {
  PlanningChangeSet,
} from "../../change-sets"

import type {
  ProjectedDepartmentSelectorOption,
} from "../selectors"

import {
  getChangeSetActionStyle,
} from "./change-set-action-style"

import { ChangeSetBadge } from "./change-set-badge"

import {
  getChangeSetPresentation,
} from "./change-set-description"

import { ChangeSetEditDialog } from "./change-set-edit-dialog"

import { ChangeSetIcon } from "./change-set-icon"


type ChangeSetCardProps = Readonly<{
  changeSet: PlanningChangeSet
  position: number
  scenarioId: string
  departments:
    readonly ProjectedDepartmentSelectorOption[]
}>


function formatPayload(
  payload: PlanningChangeSet["payload"]
): string {
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return "Não foi possível exibir os dados desta alteração."
  }
}


export function ChangeSetCard({
  changeSet,
  position,
  scenarioId,
  departments,
}: ChangeSetCardProps) {
  const presentation =
    getChangeSetPresentation(changeSet)

  const actionStyle =
    getChangeSetActionStyle(
      presentation.action
    )

  return (
    <article
      className={[
        "relative rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        actionStyle.card,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex size-10 shrink-0 items-center justify-center rounded-xl border",
            actionStyle.iconContainer,
          ].join(" ")}
        >
          <ChangeSetIcon
            entity={presentation.entity}
            size={19}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alteração {position}
              </p>

              <h3 className="mt-1 break-words text-sm font-semibold text-foreground">
                {presentation.subject ??
                  presentation.title}
              </h3>

              {presentation.subject ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {presentation.title}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <ChangeSetBadge
                action={presentation.action}
                label={presentation.actionLabel}
              />

              <ChangeSetEditDialog
                changeSet={changeSet}
                scenarioId={scenarioId}
                departments={departments}
              />
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {presentation.description}
          </p>

          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <dt className="text-muted-foreground">
                Entidade
              </dt>

              <dd className="mt-1 font-medium text-foreground">
                {presentation.entityLabel}
              </dd>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <dt className="text-muted-foreground">
                Tipo
              </dt>

              <dd className="mt-1 break-all font-mono font-medium text-foreground">
                {changeSet.changeType}
              </dd>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <dt className="text-muted-foreground">
                Versão
              </dt>

              <dd className="mt-1 font-medium text-foreground">
                v{changeSet.version}
              </dd>
            </div>
          </dl>

          <details className="group rounded-md border">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              Payload
            </summary>

            <div className="border-t bg-muted/30 p-3">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground">
                {formatPayload(
                  changeSet.payload
                )}
              </pre>
            </div>
          </details>

          <p className="break-all text-xs text-muted-foreground">
            ID: {changeSet.id}
          </p>
        </div>
      </div>
    </article>
  )
}