"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/supabase/server"

const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
})

export type CreateCompanyActionState = {
  success: boolean
  message: string
}

function createSlug(name: string) {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const baseSlug =
    normalizedName || "empresa"

  const suffix =
    crypto.randomUUID().slice(0, 8)

  return `${baseSlug}-${suffix}`
}

export async function createCompanyAction(
  input: unknown
): Promise<CreateCompanyActionState> {
  const parsedInput =
    createCompanySchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        parsedInput.error.issues[0]?.message ??
        "Dados inválidos para criar a empresa.",
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message:
        "Sua sessão expirou. Entre novamente para continuar.",
    }
  }

  const { error } = await supabase.rpc(
    "create_company_with_owner",
    {
      p_name: parsedInput.data.name,
      p_slug: createSlug(
        parsedInput.data.name
      ),
    }
  )

  if (error) {
    console.error(
      "Erro ao concluir onboarding:",
      error
    )

    if (
      error.message.includes(
        "USER_ALREADY_HAS_COMPANY"
      )
    ) {
      return {
        success: true,
        message:
          "Sua empresa já está configurada.",
      }
    }

    return {
      success: false,
      message:
        "Não foi possível criar a empresa. Tente novamente.",
    }
  }

  return {
    success: true,
    message:
      "Empresa criada com sucesso.",
  }
}
