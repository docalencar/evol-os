"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

type ManagerErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ManagerError({ error, reset }: ManagerErrorProps) {
  useEffect(() => {
    console.error("Falha ao carregar a atenção de Liderança:", error)
  }, [error])

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8">
      <h1 className="text-xl font-semibold text-red-900">
        Não foi possível carregar Liderança
      </h1>
      <p className="mt-2 text-sm text-red-800">
        A fila de atenção não foi substituída por um resultado vazio. Tente
        carregar novamente.
      </p>
      <Button className="mt-5" variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
