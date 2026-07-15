"use client"

import {
  type FormEvent,
  useState,
} from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { createCompanyAction } from "../actions/create-company-action"

export function CompanyOnboardingForm() {
  const router = useRouter()

  const [companyName, setCompanyName] =
    useState("")

  const [error, setError] =
    useState<string | null>(null)

  const [loading, setLoading] =
    useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError(null)
    setLoading(true)

    const result =
      await createCompanyAction({
        name: companyName,
      })

    if (!result.success) {
      setError(result.message)
      setLoading(false)
      return
    }

    router.push("/app")
    router.refresh()
  }

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label
          htmlFor="company-name"
          className="text-sm font-medium"
        >
          Nome da empresa
        </label>

        <Input
          id="company-name"
          name="companyName"
          placeholder="Ex.: Evol Tecnologia"
          value={companyName}
          onChange={(event) =>
            setCompanyName(event.target.value)
          }
          autoComplete="organization"
          minLength={2}
          maxLength={120}
          required
          autoFocus
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading
          ? "Criando empresa..."
          : "Criar empresa e continuar"}
      </Button>
    </form>
  )
}
