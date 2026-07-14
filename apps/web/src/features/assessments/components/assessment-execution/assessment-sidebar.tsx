"use client"

import { useEffect, useState } from "react"

import type { AssessmentAnswer } from "../../types/assessment-answer"
import type { AssessmentQuestion } from "../../types/assessment-question"
import type { AssessmentSection } from "../../types/assessment-section"

import { AssessmentSmartInsightsCard } from "./assessment-smart-insights-card"

type Props = {
  sections: AssessmentSection[]
  questionsBySection: Map<string, AssessmentQuestion[]>
  answers: AssessmentAnswer[]
  insights: {
    completedSections: number
    pendingSections: number
    averageScore: number | null
  }
}

export function AssessmentSidebar({
  sections,
  questionsBySection,
  answers,
  insights,
}: Props) {
  const [activeSection, setActiveSection] = useState<string>()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(
          (entry) => entry.isIntersecting
        )

        if (visible) {
          setActiveSection(
            visible.target.id.replace("section-", "")
          )
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0.15,
      }
    )

    sections.forEach((section) => {
      const element = document.getElementById(
        `section-${section.id}`
      )

      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [sections])

  return (
    <aside className="sticky top-24 hidden w-72 shrink-0 lg:block">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-4 font-semibold">
          Navegação
        </h3>

        <nav className="space-y-3">
          {sections.map((section) => {
            const questions =
              questionsBySection.get(section.id) ?? []

            const questionIds = new Set(
              questions.map((question) => question.id)
            )

            const answered = answers.filter((answer) =>
              questionIds.has(answer.assessment_question_id)
            ).length

            const progress =
              questions.length === 0
                ? 0
                : Math.round(
                    (answered / questions.length) * 100
                  )

            const active =
              activeSection === section.id

            return (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className={[
                  "block rounded-lg border p-3 transition-all",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:bg-muted",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {section.name}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {answered}/{questions.length}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </a>
            )
          })}
        </nav>

        <div className="mt-6">
          <AssessmentSmartInsightsCard
            insights={insights}
          />
        </div>

      </div>
    </aside>
  )
}
