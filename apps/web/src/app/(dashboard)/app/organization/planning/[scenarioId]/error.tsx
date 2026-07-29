"use client"

import { useEffect } from "react"

import { PlanningDashboardErrorState } from "@/features/organization-planning/planning-dashboard"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Failed to load planning dashboard", error)
  }, [error])

  return <PlanningDashboardErrorState retry={reset} />
}
