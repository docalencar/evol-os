/**
 * Rótulos de perspectiva para as superfícies de *directory* de resultados.
 *
 * Ponto único para o directory do avaliado (0117) e para o directory
 * administrativo por Pessoa (0118). Ambos os RPCs devolvem a mesma allowlist
 * positiva de três perspectivas — `direct_report` é omitido no banco enquanto a
 * política de anonimato da B2-C não existir, então não há rótulo para ele aqui.
 *
 * A página de resultado individual mantém um mapa próprio de quatro chaves em
 * `assessment-result-presenter.ts`, porque aquela superfície precisa rotular
 * `direct_report`. Unificar os dois exigiria mexer em tipagem fora do escopo
 * desta slice; fica registrado como débito.
 */
export type DirectoryPerspective = "self" | "manager" | "legacy_unknown"

export const DIRECTORY_PERSPECTIVE_LABELS: Readonly<
  Record<DirectoryPerspective, string>
> = Object.freeze({
  self: "Autoavaliação",
  manager: "Gestor",
  legacy_unknown: "Histórico — perspectiva não identificada",
})
