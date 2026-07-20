"use client"

import type { ReactNode } from "react"
import {
  Check,
  ChevronDown,
} from "lucide-react"

import { cn } from "@/utils/cn"

import { useProductWizard } from "./context"

type ProductWizardStepProps = {
  id: string
  title: string
  description?: string
  summary?: ReactNode
  children: ReactNode
  className?: string
}

export function ProductWizardStep({
  id,
  title,
  description,
  summary,
  children,
  className,
}: ProductWizardStepProps) {
  const {
    goToStep,
    isStepActive,
    isStepCompleted,
    canOpenStep,
  } = useProductWizard()

  const active = isStepActive(id)
  const completed = isStepCompleted(id)
  const canOpen = canOpenStep(id)

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-background transition-all duration-300",
        active && "border-primary shadow-md scale-[1.01]",
        className
      )}
    >
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => goToStep(id)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left disabled:cursor-default"
        aria-expanded={active}
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            completed &&
              "border-primary bg-primary text-primary-foreground",
            active &&
              !completed &&
              "border-primary text-primary"
          )}
        >
          {completed ? (
            <Check className="h-4 w-4" />
          ) : (
            <span>
              {id.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {title}
          </span>

          {active && description ? (
            <span className="mt-1 block text-sm text-muted-foreground">
              {description}
            </span>
          ) : null}

          {!active && completed && summary ? (
            <span className="mt-2 block">
              {summary}
            </span>
          ) : null}
        </span>

        {canOpen ? (
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              active && "rotate-180"
            )}
          />
        ) : null}
      </button>

      {active ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 border-t px-4 py-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}
