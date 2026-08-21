// Focused PT-BR copy helper for the employee-import pre-analysis screen.
// Composes the whole sentence per count so singular/plural agreement is correct
// BY CONSTRUCTION — never by appending suffixes to a conjugated verb (which
// produced defects like "seráão"). No i18n framework; just correct Portuguese.

export function presentImportComparisonSentence(
  collaboratorCount: number
): string {
  if (collaboratorCount === 1) {
    return "1 colaborador será comparado com a organização atual."
  }

  return `${collaboratorCount} colaboradores serão comparados com a organização atual.`
}
