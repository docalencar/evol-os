import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { PositionFormPosition } from "./types"

type PositionBasicInformationSectionProps = {
  position?: PositionFormPosition
}

export function PositionBasicInformationSection({
  position,
}: PositionBasicInformationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>

        <Input
          id="name"
          name="name"
          placeholder="Ex: Analista de RH"
          defaultValue={position?.name ?? ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>

        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a responsabilidade deste cargo."
          defaultValue={position?.description ?? ""}
        />
      </div>
    </div>
  )
}
