import Link from "next/link"

import { ArrowLeft } from "lucide-react"

import { cn } from "@/utils/cn"

type EntityBackLinkProps = {
  // Deterministic parent destination — a real href to the list/parent route.
  href: string
  // Explicit Portuguese label, e.g. "Voltar para pessoas".
  label: string
  className?: string
}

// Shared, deterministic back-navigation control for detail/subflow pages.
// A plain semantic anchor (keyboard-accessible, a real link to a fixed parent),
// with a single consistent visual treatment across the app.
export function EntityBackLink({
  href,
  label,
  className,
}: EntityBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  )
}
