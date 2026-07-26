"use client"

import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Users,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"

export type PlanningChangeCategory =
  | "department"
  | "team"
  | "position"
  | "employee"

type PlanningChangeSelectorProps = {
  onSelect: (
    category: PlanningChangeCategory
  ) => void
}

type ChangeCategoryCardProps = {
  title: string
  description: string
  icon: typeof Building2
  disabled?: boolean
  onClick: () => void
}

function ChangeCategoryCard({
  title,
  description,
  icon: Icon,
  disabled = false,
  onClick,
}: ChangeCategoryCardProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={[
        "h-auto w-full justify-start whitespace-normal",
        "rounded-xl p-0 text-left",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-primary/40 hover:bg-muted/50",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="flex w-full items-center gap-4 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>

            {disabled ? (
              <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Em breve
              </span>
            ) : null}
          </span>

          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        </span>

        {!disabled ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : null}
      </span>
    </Button>
  )
}

export function PlanningChangeSelector({
  onSelect,
}: PlanningChangeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">
          Qual estrutura deseja alterar?
        </h3>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Escolha uma categoria para adicionar uma mudança
          ao cenário de planejamento.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChangeCategoryCard
          title="Departamento"
          description="Crie, atualize ou arquive departamentos na estrutura projetada."
          icon={Building2}
          onClick={() => onSelect("department")}
        />

        <ChangeCategoryCard
          title="Equipe"
          description="Crie, atualize ou arquive equipes na estrutura projetada."
          icon={Users}
          onClick={() => onSelect("team")}
        />

        <ChangeCategoryCard
          title="Cargo"
          description="Crie, atualize, mova ou arquive cargos planejados."
          icon={BriefcaseBusiness}
          disabled
          onClick={() => undefined}
        />

        <ChangeCategoryCard
          title="Colaborador"
          description="Planeje admissões, movimentações, desligamentos e outras mudanças."
          icon={UserRound}
          disabled
          onClick={() => undefined}
        />
      </div>
    </div>
  )
}
