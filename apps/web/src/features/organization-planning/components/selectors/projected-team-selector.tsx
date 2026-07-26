import {
  Label,
} from "@/components/ui/label"

export type ProjectedTeamSelectorOption =
  Readonly<{
    id: string
    name: string
    code: string | null
    description: string | null
    departmentId: string | null
    status: string
  }>

type ProjectedTeamSelectorProps = {
  teams:
    readonly ProjectedTeamSelectorOption[]
  name?: string
  id?: string
  label?: string
  description?: string
  placeholder?: string
  defaultValue?: string | null
  disabled?: boolean
  required?: boolean
}

const selectClassName = [
  "flex h-10 w-full rounded-md border border-input",
  "bg-background px-3 py-2 text-sm",
  "ring-offset-background",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
].join(" ")

function sortTeams(
  teams:
    readonly ProjectedTeamSelectorOption[]
) {
  return [...teams]
    .filter(
      (team) =>
        team.status === "active"
    )
    .sort((first, second) =>
      first.name.localeCompare(
        second.name,
        "pt-BR",
        {
          sensitivity: "base",
        }
      )
    )
}

function getTeamLabel(
  team: ProjectedTeamSelectorOption
) {
  if (!team.code) {
    return team.name
  }

  return `${team.name} (${team.code})`
}

export function ProjectedTeamSelector({
  teams,
  name = "teamId",
  id = "projected-team-selector",
  label = "Equipe",
  description,
  placeholder = "Selecione uma equipe",
  defaultValue,
  disabled = false,
  required = false,
}: ProjectedTeamSelectorProps) {
  const activeTeams =
    sortTeams(teams)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
      </Label>

      <select
        id={id}
        name={name}
        className={selectClassName}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        required={required}
      >
        <option
          value=""
          disabled
        >
          {placeholder}
        </option>

        {activeTeams.map(
          (team) => (
            <option
              key={team.id}
              value={team.id}
            >
              {getTeamLabel(team)}
            </option>
          )
        )}
      </select>

      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}

      {activeTeams.length === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Não há equipes ativas disponíveis na
          estrutura projetada.
        </p>
      ) : null}
    </div>
  )
}
