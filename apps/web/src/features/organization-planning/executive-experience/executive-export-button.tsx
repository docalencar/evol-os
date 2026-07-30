"use client"

import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ExecutiveExportButton() {
  return <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}><Printer aria-hidden="true" className="size-4" /> Exportar PDF / Imprimir</Button>
}
