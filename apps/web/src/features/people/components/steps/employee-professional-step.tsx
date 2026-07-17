import { ProductWizardSummary } from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const employeeDiscProfiles = [
  { value: "D", label: "D — Dominância" },
  { value: "I", label: "I — Influência" },
  { value: "S", label: "S — Estabilidade" },
  { value: "C", label: "C — Conformidade" },
  {
    value: "ID",
    label: "ID — Influência / Dominância",
  },
  {
    value: "IS",
    label: "IS — Influência / Estabilidade",
  },
  {
    value: "IC",
    label: "IC — Influência / Conformidade",
  },
  {
    value: "DI",
    label: "DI — Dominância / Influência",
  },
  {
    value: "DS",
    label: "DS — Dominância / Estabilidade",
  },
  {
    value: "DC",
    label: "DC — Dominância / Conformidade",
  },
  {
    value: "SI",
    label: "SI — Estabilidade / Influência",
  },
  {
    value: "SD",
    label: "SD — Estabilidade / Dominância",
  },
  {
    value: "SC",
    label: "SC — Estabilidade / Conformidade",
  },
  {
    value: "CI",
    label: "CI — Conformidade / Influência",
  },
  {
    value: "CD",
    label: "CD — Conformidade / Dominância",
  },
  {
    value: "CS",
    label: "CS — Conformidade / Estabilidade",
  },
] as const

type EmployeeProfessionalStepProps = {
  discProfile: string
  hireDate: string
  birthDate: string
  onDiscProfileChange: (value: string) => void
  onHireDateChange: (value: string) => void
  onBirthDateChange: (value: string) => void
}

export function EmployeeProfessionalStep({
  discProfile,
  hireDate,
  birthDate,
  onDiscProfileChange,
  onHireDateChange,
  onBirthDateChange,
}: EmployeeProfessionalStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="employee-disc-profile">
          Perfil DISC
        </Label>

        <select
          id="employee-disc-profile"
          value={discProfile}
          onChange={(event) =>
            onDiscProfileChange(event.target.value)
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Não informado</option>

          {employeeDiscProfiles.map(
            (profile) => (
              <option
                key={profile.value}
                value={profile.value}
              >
                {profile.label}
              </option>
            )
          )}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="employee-hire-date">
            Data de admissão
          </Label>

          <Input
            id="employee-hire-date"
            type="date"
            value={hireDate}
            onChange={(event) =>
              onHireDateChange(event.target.value)
            }
          />
        </div>

        <div>
          <Label htmlFor="employee-birth-date">
            Data de nascimento
          </Label>

          <Input
            id="employee-birth-date"
            type="date"
            value={birthDate}
            onChange={(event) =>
              onBirthDateChange(event.target.value)
            }
          />
        </div>
      </div>
    </div>
  )
}

type EmployeeProfessionalSummaryProps = {
  discProfileLabel?: string
  hireDate: string
}

export function EmployeeProfessionalSummary({
  discProfileLabel,
  hireDate,
}: EmployeeProfessionalSummaryProps) {
  return (
    <ProductWizardSummary>
      {[
        discProfileLabel
          ? `DISC: ${discProfileLabel}`
          : "DISC não informado",
        hireDate
          ? `Admissão: ${formatEmployeeDate(hireDate)}`
          : "Admissão não informada",
      ].join(" · ")}
    </ProductWizardSummary>
  )
}

export function formatEmployeeDate(
  value: string
) {
  if (!value) {
    return "Não informada"
  }

  const [year, month, day] =
    value.split("-")

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}
