"use client"

import {
  useState,
} from "react"
import {
  ArrowLeft,
  Building2,
  Plus,
  Users,
} from "lucide-react"

import {
  EntityDialog,
} from "@/components/shared/entity-dialog"
import {
  Button,
} from "@/components/ui/button"

import {
  DepartmentArchiveChangeForm,
  DepartmentArchiveSelector,
  DepartmentCreateChangeForm,
  DepartmentUpdateChangeForm,
  DepartmentUpdateSelector,
} from "./changes/department"
import {
  TeamArchiveChangeForm,
  TeamArchiveSelector,
  TeamCreateChangeForm,
  TeamUpdateChangeForm,
  TeamUpdateSelector,
} from "./changes/team"
import {
  PlanningChangeSelector,
  type PlanningChangeCategory,
} from "./planning-change-selector"
import type {
  ProjectedDepartmentSelectorOption,
  ProjectedTeamSelectorOption,
} from "./selectors"

type PlanningChangeDialogProps = {
  scenarioId: string
  departments:
    readonly ProjectedDepartmentSelectorOption[]
  teams:
    readonly ProjectedTeamSelectorOption[]
  disabled?: boolean
}

type DialogStep =
  | {
      name: "category"
    }
  | {
      name: "department-action"
    }
  | {
      name: "department-create"
    }
  | {
      name: "department-update-select"
    }
  | {
      name: "department-update"
      department:
        ProjectedDepartmentSelectorOption
    }
  | {
      name: "department-archive-select"
    }
  | {
      name: "department-archive"
      department:
        ProjectedDepartmentSelectorOption
    }
  | {
      name: "team-action"
    }
  | {
      name: "team-create"
    }
  | {
      name: "team-update-select"
    }
  | {
      name: "team-update"
      team: ProjectedTeamSelectorOption
    }
  | {
      name: "team-archive-select"
    }
  | {
      name: "team-archive"
      team: ProjectedTeamSelectorOption
    }

function getDialogTitle(
  step: DialogStep
) {
  switch (step.name) {
    case "department-create":
      return "Criar departamento"

    case "department-update-select":
      return "Selecionar departamento"

    case "department-update":
      return "Atualizar departamento"

    case "department-archive-select":
      return "Selecionar departamento"

    case "department-archive":
      return "Arquivar departamento"

    case "department-action":
      return "Alterar departamentos"

    case "team-create":
      return "Criar equipe"

    case "team-update-select":
      return "Selecionar equipe"

    case "team-update":
      return "Atualizar equipe"

    case "team-archive-select":
      return "Selecionar equipe"

    case "team-archive":
      return "Arquivar equipe"

    case "team-action":
      return "Alterar equipes"

    default:
      return "Nova alteração"
  }
}

function getDialogDescription(
  step: DialogStep
) {
  switch (step.name) {
    case "department-create":
      return "Adicione um novo departamento à estrutura projetada."

    case "department-update-select":
      return "Escolha o departamento que deseja atualizar na estrutura projetada."

    case "department-update":
      return "Atualize os dados do departamento selecionado."

    case "department-archive-select":
      return "Escolha o departamento que deseja arquivar na estrutura projetada."

    case "department-archive":
      return "Confirme o arquivamento do departamento selecionado."

    case "department-action":
      return "Escolha a operação que deseja simular."

    case "team-create":
      return "Adicione uma nova equipe à estrutura projetada."

    case "team-update-select":
      return "Escolha a equipe que deseja atualizar na estrutura projetada."

    case "team-update":
      return "Atualize os dados da equipe selecionada."

    case "team-archive-select":
      return "Escolha a equipe que deseja arquivar na estrutura projetada."

    case "team-archive":
      return "Confirme o arquivamento da equipe selecionada."

    case "team-action":
      return "Escolha a operação que deseja simular."

    default:
      return "Adicione uma mudança à estrutura projetada neste cenário."
  }
}

export function PlanningChangeDialog({
  scenarioId,
  departments,
  teams,
  disabled = false,
}: PlanningChangeDialogProps) {
  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    step,
    setStep,
  ] = useState<DialogStep>({
    name: "category",
  })

  function resetDialog() {
    setStep({
      name: "category",
    })
  }

  function handleOpenChange(
    nextOpen: boolean
  ) {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetDialog()
    }
  }

  function handleCategorySelect(
    category: PlanningChangeCategory
  ) {
    if (category === "department") {
      setStep({
        name: "department-action",
      })
      return
    }

    if (category === "team") {
      setStep({
        name: "team-action",
      })
    }
  }

  function handleDepartmentUpdateSelect(
    department:
      ProjectedDepartmentSelectorOption
  ) {
    setStep({
      name: "department-update",
      department,
    })
  }

  function handleDepartmentArchiveSelect(
    department:
      ProjectedDepartmentSelectorOption
  ) {
    setStep({
      name: "department-archive",
      department,
    })
  }

  function handleTeamUpdateSelect(
    team: ProjectedTeamSelectorOption
  ) {
    setStep({
      name: "team-update",
      team,
    })
  }

  function handleTeamArchiveSelect(
    team: ProjectedTeamSelectorOption
  ) {
    setStep({
      name: "team-archive",
      team,
    })
  }

  function handleSuccess() {
    setOpen(false)
    resetDialog()
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          title={
            disabled
              ? "Somente cenários em rascunho podem receber alterações."
              : undefined
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova alteração
        </Button>
      }
      title={getDialogTitle(step)}
      description={getDialogDescription(step)}
      contentClassName="sm:max-w-2xl"
      bodyClassName="overflow-y-auto"
    >
      {step.name === "category" ? (
        <PlanningChangeSelector
          onSelect={handleCategorySelect}
        />
      ) : null}

      {step.name ===
      "department-action" ? (
        <div className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setStep({
                name: "category",
              })
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="rounded-2xl border bg-muted/20 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>

              <div>
                <h3 className="font-semibold">
                  Alterações em departamentos
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Escolha a operação que deseja
                  simular na estrutura
                  organizacional.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className={[
                "h-auto w-full justify-start",
                "rounded-xl p-4 text-left",
                "whitespace-normal",
              ].join(" ")}
              onClick={() =>
                setStep({
                  name: "department-create",
                })
              }
            >
              <span>
                <span className="block text-sm font-semibold">
                  Criar departamento
                </span>

                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Adicione um novo departamento ao
                  cenário.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={[
                "h-auto w-full justify-start",
                "rounded-xl p-4 text-left",
                "whitespace-normal",
              ].join(" ")}
              onClick={() =>
                setStep({
                  name:
                    "department-update-select",
                })
              }
            >
              <span>
                <span className="block text-sm font-semibold">
                  Atualizar departamento
                </span>

                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Altere nome, código, descrição ou
                  hierarquia.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={[
                "h-auto w-full justify-start",
                "rounded-xl p-4 text-left",
                "whitespace-normal",
              ].join(" ")}
              onClick={() =>
                setStep({
                  name:
                    "department-archive-select",
                })
              }
            >
              <span>
                <span className="block text-sm font-semibold">
                  Arquivar departamento
                </span>

                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Remova um departamento da
                  estrutura projetada.
                </span>
              </span>
            </Button>
          </div>
        </div>
      ) : null}

      {step.name === "team-action" ? (
        <div className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setStep({
                name: "category",
              })
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="rounded-2xl border bg-muted/20 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>

              <div>
                <h3 className="font-semibold">
                  Alterações em equipes
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Escolha a operação que deseja
                  simular na estrutura
                  organizacional.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className={[
                "h-auto w-full justify-start",
                "rounded-xl p-4 text-left",
                "whitespace-normal",
              ].join(" ")}
              onClick={() =>
                setStep({
                  name: "team-create",
                })
              }
            >
              <span>
                <span className="block text-sm font-semibold">
                  Criar equipe
                </span>

                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Adicione uma nova equipe ao
                  cenário.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={[
                "h-auto w-full justify-start",
                "rounded-xl p-4 text-left",
                "whitespace-normal",
              ].join(" ")}
              onClick={() =>
                setStep({
                  name: "team-update-select",
                })
              }
            >
              <span>
                <span className="block text-sm font-semibold">
                  Atualizar equipe
                </span>

                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Altere nome, código, descrição ou
                  departamento.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={[
                "h-auto w-full justify-start",
                "rounded-xl p-4 text-left",
                "whitespace-normal",
              ].join(" ")}
              onClick={() =>
                setStep({
                  name: "team-archive-select",
                })
              }
            >
              <span>
                <span className="block text-sm font-semibold">
                  Arquivar equipe
                </span>

                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Remova uma equipe da estrutura
                  projetada.
                </span>
              </span>
            </Button>
          </div>
        </div>
      ) : null}

      {step.name ===
      "department-create" ? (
        <DepartmentCreateChangeForm
          scenarioId={scenarioId}
          departments={departments}
          onCancel={() =>
            setStep({
              name: "department-action",
            })
          }
          onSuccess={handleSuccess}
        />
      ) : null}

      {step.name ===
      "department-update-select" ? (
        <DepartmentUpdateSelector
          departments={departments}
          onCancel={() =>
            setStep({
              name: "department-action",
            })
          }
          onSelect={
            handleDepartmentUpdateSelect
          }
        />
      ) : null}

      {step.name ===
      "department-update" ? (
        <DepartmentUpdateChangeForm
          scenarioId={scenarioId}
          department={step.department}
          departments={departments}
          onCancel={() =>
            setStep({
              name:
                "department-update-select",
            })
          }
          onSuccess={handleSuccess}
        />
      ) : null}

      {step.name ===
      "department-archive-select" ? (
        <DepartmentArchiveSelector
          departments={departments}
          onCancel={() =>
            setStep({
              name: "department-action",
            })
          }
          onSelect={
            handleDepartmentArchiveSelect
          }
        />
      ) : null}

      {step.name ===
      "department-archive" ? (
        <DepartmentArchiveChangeForm
          scenarioId={scenarioId}
          department={step.department}
          onCancel={() =>
            setStep({
              name:
                "department-archive-select",
            })
          }
          onSuccess={handleSuccess}
        />
      ) : null}

      {step.name === "team-create" ? (
        <TeamCreateChangeForm
          scenarioId={scenarioId}
          departments={departments}
          onCancel={() =>
            setStep({
              name: "team-action",
            })
          }
          onSuccess={handleSuccess}
        />
      ) : null}

      {step.name ===
      "team-update-select" ? (
        <TeamUpdateSelector
          teams={teams}
          onCancel={() =>
            setStep({
              name: "team-action",
            })
          }
          onSelect={handleTeamUpdateSelect}
        />
      ) : null}

      {step.name === "team-update" ? (
        <TeamUpdateChangeForm
          scenarioId={scenarioId}
          team={step.team}
          departments={departments}
          onCancel={() =>
            setStep({
              name: "team-update-select",
            })
          }
          onSuccess={handleSuccess}
        />
      ) : null}

      {step.name ===
      "team-archive-select" ? (
        <TeamArchiveSelector
          teams={teams}
          onCancel={() =>
            setStep({
              name: "team-action",
            })
          }
          onSelect={
            handleTeamArchiveSelect
          }
        />
      ) : null}

      {step.name === "team-archive" ? (
        <TeamArchiveChangeForm
          scenarioId={scenarioId}
          team={step.team}
          onCancel={() =>
            setStep({
              name: "team-archive-select",
            })
          }
          onSuccess={handleSuccess}
        />
      ) : null}
    </EntityDialog>
  )
}
