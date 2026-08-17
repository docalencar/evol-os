"use client"

import { Button } from "@/components/ui/button"

export default function AssessmentsErrorPage({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
      <div>
        <h2 className="text-lg font-semibold">
          Não foi possível carregar Avaliações
        </h2>
        <p className="text-sm text-muted-foreground">
          Tente novamente em instantes.
        </p>
      </div>
      <Button type="button" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
