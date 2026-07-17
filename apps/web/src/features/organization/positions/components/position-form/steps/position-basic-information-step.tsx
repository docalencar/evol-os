import { ProductWizardSummary } from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type PositionBasicInformationStepProps = {
  name: string
  description: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

export function PositionBasicInformationStep({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: PositionBasicInformationStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="position-name">
          Nome do cargo
        </Label>

        <Input
          id="position-name"
          value={name}
          onChange={(event) =>
            onNameChange(event.target.value)
          }
          placeholder="Ex.: Analista de RH"
          minLength={2}
          maxLength={100}
          autoFocus
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Use um nome claro e reconhecido pelas pessoas da organização.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position-description">
          Descrição
        </Label>

        <Textarea
          id="position-description"
          value={description}
          onChange={(event) =>
            onDescriptionChange(
              event.target.value
            )
          }
          placeholder="Descreva as principais responsabilidades deste cargo."
          maxLength={255}
          rows={5}
        />

        <p className="text-right text-xs text-muted-foreground">
          {description.length}/255
        </p>
      </div>
    </div>
  )
}

type PositionBasicInformationSummaryProps = {
  name: string
  description: string
}

export function PositionBasicInformationSummary({
  name,
  description,
}: PositionBasicInformationSummaryProps) {
  return (
    <ProductWizardSummary>
      {[
        name.trim() || "Nome não informado",
        description.trim()
          ? "Descrição preenchida"
          : "Sem descrição",
      ].join(" · ")}
    </ProductWizardSummary>
  )
}
