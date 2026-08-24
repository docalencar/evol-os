export type AssessmentResultBackLink = Readonly<{
  href: string
  label: string
}>

const assessmentsBackLink: AssessmentResultBackLink = {
  href: "/app/assessments",
  label: "Voltar para avaliações",
}

export function resolveAssessmentResultBackLink(
  source: string | undefined
): AssessmentResultBackLink {
  if (source === "assessments-results") {
    return {
      href: "/app/assessments#meus-resultados",
      label: "Voltar para meus resultados",
    }
  }

  return assessmentsBackLink
}
