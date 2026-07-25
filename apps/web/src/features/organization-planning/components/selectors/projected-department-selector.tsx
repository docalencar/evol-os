import {
  Label,
} from "@/components/ui/label"

export type ProjectedDepartmentSelectorOption =
  Readonly<{
    id: string
    name: string
    code: string | null
    description: string | null
    parentDepartmentId: string | null
    status: string
  }>

type ProjectedDepartmentSelectorProps = {
  departments:
    readonly ProjectedDepartmentSelectorOption[]
  name?: string
  id?: string
  label?: string
  description?: string
  placeholder?: string
  defaultValue?: string | null
  disabled?: boolean
  required?: boolean
  allowNoDepartment?: boolean
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

function sortDepartments(
  departments:
    readonly ProjectedDepartmentSelectorOption[]
) {
  return [...departments]
    .filter(
      (department) =>
        department.status === "active"
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

function getDepartmentLabel(
  department:
    ProjectedDepartmentSelectorOption
) {
  if (!department.code) {
    return department.name
  }

  return `${department.name} (${department.code})`
}

export function ProjectedDepartmentSelector({
  departments,
  name = "departmentId",
  id = "projected-department-selector",
  label = "Departamento",
  description,
  placeholder = "Selecione um departamento",
  defaultValue,
  disabled = false,
  required = false,
  allowNoDepartment = false,
}: ProjectedDepartmentSelectorProps) {
  const activeDepartments =
    sortDepartments(departments)

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
        {allowNoDepartment ? (
          <option value="">
            Sem departamento superior
          </option>
        ) : (
          <option
            value=""
            disabled
          >
            {placeholder}
          </option>
        )}

        {activeDepartments.map(
          (department) => (
            <option
              key={department.id}
              value={department.id}
            >
              {getDepartmentLabel(
                department
              )}
            </option>
          )
        )}
      </select>

      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}

      {activeDepartments.length === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Não há departamentos ativos disponíveis
          na estrutura projetada.
        </p>
      ) : null}
    </div>
  )
}
