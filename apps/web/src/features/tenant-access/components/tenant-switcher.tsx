"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { selectActiveTenantAction } from "../actions/select-active-tenant-action"

type TenantSwitcherOption = Readonly<{
  companyId: string
  companyName: string
}>

export function TenantSwitcher({
  currentCompanyId,
  currentCompanyName,
  options,
  canSwitch,
}: {
  currentCompanyId: string
  currentCompanyName: string
  options: readonly TenantSwitcherOption[]
  canSwitch: boolean
}) {
  const router = useRouter()
  const switchInFlight = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSelectedCompanyId(currentCompanyId)
  }, [currentCompanyId])

  useEffect(() => {
    if (errorMessage) errorRef.current?.focus()
  }, [errorMessage])

  function handleCompanyChange(companyId: string) {
    if (
      switchInFlight.current ||
      companyId === currentCompanyId ||
      !options.some((option) => option.companyId === companyId)
    ) {
      return
    }

    switchInFlight.current = true
    setSelectedCompanyId(companyId)
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

      switchInFlight.current = false
      setSelectedCompanyId(currentCompanyId)
      setErrorMessage(result.message)
    })
  }

  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-slate-500">
        Empresa atual
      </p>

      {canSwitch ? (
        <select
          id="active-company"
          aria-label="Empresa atual"
          value={selectedCompanyId}
          onChange={(event) => handleCompanyChange(event.target.value)}
          disabled={isPending}
          aria-describedby={errorMessage ? "tenant-switcher-error" : undefined}
          className="h-9 max-w-56 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-evol-blue focus:outline-none focus:ring-1 focus:ring-evol-blue disabled:cursor-wait disabled:opacity-60"
        >
          {options.map((option) => (
            <option key={option.companyId} value={option.companyId}>
              {option.companyName}
            </option>
          ))}
        </select>
      ) : (
        <p className="max-w-56 truncate text-sm font-medium text-slate-900">
          {currentCompanyName}
        </p>
      )}

      {isPending ? (
        <p role="status" className="text-xs text-slate-500">
          Trocando empresa...
        </p>
      ) : null}

      {errorMessage ? (
        <p
          ref={errorRef}
          id="tenant-switcher-error"
          role="alert"
          tabIndex={-1}
          className="max-w-56 text-xs text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
