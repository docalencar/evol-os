"use client"

import { createContext, useContext } from "react"

import type { ProductWizardContextValue } from "./types"

export const ProductWizardContext =
  createContext<ProductWizardContextValue | null>(null)

export function useProductWizard() {
  const context = useContext(ProductWizardContext)

  if (!context) {
    throw new Error(
      "useProductWizard deve ser utilizado dentro de ProductWizard."
    )
  }

  return context
}
