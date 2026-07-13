import { Button } from "@/components/ui/button"

type PositionActionsSectionProps = {
  isPending: boolean
  isEditing: boolean
}

export function PositionActionsSection({
  isPending,
  isEditing,
}: PositionActionsSectionProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="submit" disabled={isPending}>
        {isPending
          ? "Salvando..."
          : isEditing
            ? "Salvar alterações"
            : "Criar cargo"}
      </Button>
    </div>
  )
}