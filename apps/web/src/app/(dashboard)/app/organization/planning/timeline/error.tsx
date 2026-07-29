"use client"

import { useEffect } from "react"

import { TimelineErrorState } from "@/features/organization-planning/timeline-ui"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Failed to load planning timeline", error)
  }, [error])

  return <TimelineErrorState retry={reset} />
}
