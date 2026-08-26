export type AssessmentResultBackLink = Readonly<{
  href: string
  label: string
}>

const assessmentsBackLink: AssessmentResultBackLink = {
  href: "/app/assessments",
  label: "Voltar para avaliações",
}

/**
 * Único formato aceito para o identificador que acompanha a origem.
 *
 * O destino de retorno NÃO é uma URL fornecida pelo cliente. A query string só
 * carrega uma origem de uma allowlist fechada e, quando a origem exige, um
 * identificador opaco que precisa ser um UUID. O caminho final é montado aqui a
 * partir de literais do próprio código, de modo que nada que o usuário digite
 * vire destino de navegação.
 */
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isAssessmentResultReturnPersonId(
  personId: string | undefined
): personId is string {
  return typeof personId === "string" && uuidPattern.test(personId)
}

export function resolveAssessmentResultBackLink(
  source: string | undefined,
  personId?: string
): AssessmentResultBackLink {
  if (source === "assessments-results") {
    return {
      href: "/app/assessments#meus-resultados",
      label: "Voltar para meus resultados",
    }
  }

  // `person-assessments` só é honrado com um UUID válido. Sem isso o destino
  // seria montado a partir de texto arbitrário do cliente, então cai no
  // fallback seguro em vez de tentar adivinhar a Pessoa.
  if (source === "person-assessments" && isAssessmentResultReturnPersonId(personId)) {
    return {
      href: `/app/people/${personId}#ultimas-avaliacoes`,
      label: "Voltar para a pessoa",
    }
  }

  return assessmentsBackLink
}
