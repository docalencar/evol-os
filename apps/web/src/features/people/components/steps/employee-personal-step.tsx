import { ProductWizardSummary } from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type EmployeePersonalStepProps = {
  fullName: string
  email: string
  phone: string
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPhoneChange: (value: string) => void
}

export function EmployeePersonalStep({
  fullName,
  email,
  phone,
  onFullNameChange,
  onEmailChange,
  onPhoneChange,
}: EmployeePersonalStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="employee-full-name">
          Nome completo
        </Label>

        <Input
          id="employee-full-name"
          value={fullName}
          onChange={(event) =>
            onFullNameChange(event.target.value)
          }
          placeholder="Ex.: Ana Bezerra"
          maxLength={120}
          autoComplete="name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="employee-email">
            E-mail
          </Label>

          <Input
            id="employee-email"
            type="email"
            value={email}
            onChange={(event) =>
              onEmailChange(event.target.value)
            }
            placeholder="ana@empresa.com"
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="employee-phone">
            Telefone
          </Label>

          <Input
            id="employee-phone"
            value={phone}
            onChange={(event) =>
              onPhoneChange(event.target.value)
            }
            placeholder="(85) 99999-9999"
            autoComplete="tel"
          />
        </div>
      </div>
    </div>
  )
}

type EmployeePersonalSummaryProps = {
  fullName: string
  email: string
}

export function EmployeePersonalSummary({
  fullName,
  email,
}: EmployeePersonalSummaryProps) {
  const details = [
    fullName.trim() || "Nome não informado",
    email.trim() || null,
  ].filter(Boolean)

  return (
    <ProductWizardSummary>
      {details.join(" · ")}
    </ProductWizardSummary>
  )
}
