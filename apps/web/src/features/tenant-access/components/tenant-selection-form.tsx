"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

import { selectActiveTenantAction } from "../actions/select-active-tenant-action"

export type TenantSelectionFormOption = Readonly<{
  companyId: string
  companyName: string
}>

export function TenantSelectionForm({
  options,
}: {
  options: readonly TenantSelectionFormOption[]
}) {
  const router = useRouter()
  const submissionInFlight = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (errorMessage) {
      errorRef.current?.focus()
    }
  }, [errorMessage])

  function handleSubmit(formData: FormData) {
    if (submissionInFlight.current) return

    const companyId = String(formData.get("companyId") ?? "")
    if (!companyId) {
      setErrorMessage("Selecione uma empresa para continuar.")
      return
    }

    submissionInFlight.current = true
    setErrorMessage(null)

    startTransition(async () => {
      const result = await selectActiveTenantAction({ companyId })

      if (result.status === "selected") {
        router.replace("/app")
        router.refresh()
        return
      }

      if (result.status === "session_expired") {
        router.replace("/login")
        return
      }

      submissionInFlight.current = false
      setErrorMessage(result.message)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <fieldset disabled={isPending} className="space-y-2">
        <legend className="sr-only">Empresas disponíveis</legend>

        {options.map((option) => (
          <label
            key={option.companyId}
            className="flex cursor-pointer items-center gap-3 rounded border border-slate-200 px-3 py-3 text-sm text-slate-900 transition-colors has-[:checked]:border-evol-blue has-[:checked]:bg-blue-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-evol-blue"
          >
            <input
              type="radio"
              name="companyId"
              value={option.companyId}
              checked={selectedCompanyId === option.companyId}
              onChange={() => setSelectedCompanyId(option.companyId)}
              className="h-4 w-4"
            />
            <span className="font-medium">{option.companyName}</span>
          </label>
        ))}
      </fieldset>

      {errorMessage ? (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending || !selectedCompanyId}
        className="w-full"
      >
        {isPending ? "Entrando..." : "Continuar com esta empresa"}
      </Button>
    </form>
  )
}
