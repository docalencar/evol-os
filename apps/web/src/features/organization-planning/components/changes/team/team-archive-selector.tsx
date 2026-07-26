"use client"

import {
  Archive,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import type {
  ProjectedTeamSelectorOption,
} from "../../selectors"

type TeamArchiveSelectorProps = {
  teams:
    readonly ProjectedTeamSelectorOption[]
  onSelect: (
    team: ProjectedTeamSelectorOption
  ) => void
  onCancel?: () => void
}

function sortTeams(
  teams:
    readonly ProjectedTeamSelectorOption[]
) {
  return [...teams]
    .filter(
      (team) =>
        team.status === "active"
    )
    .sort((left, right) =>
      left.name.localeCompare(
        right.name,
        "pt-BR",
        {
          sensitivity: "base",
        }
      )
    )
}

function getLabel(
  team: ProjectedTeamSelectorOption
) {
  if (!team.code) {
    return team.name
  }

  return `${team.name} (${team.code})`
}

export function TeamArchiveSelector({
  teams,
  onSelect,
  onCancel,
}: TeamArchiveSelectorProps) {
  const activeTeams =
    sortTeams(teams)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
            <Archive className="h-5 w-5 text-muted-foreground" />
          </div>

          <div>
            <h3 className="font-medium">
              Arquivar equipe
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Escolha qual equipe será arquivada no
              cenário.
            </p>
          </div>
        </div>
      </div>

      {activeTeams.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Não existem equipes ativas disponíveis para
          arquivamento.
        </div>
      ) : (
        <div className="space-y-2">
          {activeTeams.map(
            (team) => (
              <Button
                key={team.id}
                type="button"
                variant="outline"
                className={[
                  "h-auto w-full justify-start",
                  "rounded-xl p-4 text-left",
                  "whitespace-normal",
                ].join(" ")}
                onClick={() =>
                  onSelect(team)
                }
              >
                <span className="flex w-full items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                  <span className="block">
                    <span className="block font-medium">
                      {getLabel(team)}
                    </span>

                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Selecionar esta equipe para
                      arquivamento.
                    </span>
                  </span>
                </span>
              </Button>
            )
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Voltar
        </Button>
      </div>
    </div>
  )
}
