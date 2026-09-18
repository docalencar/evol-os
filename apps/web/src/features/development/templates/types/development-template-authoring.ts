/**
 * The named failures the template authoring server layer may raise.
 *
 * They exist so the Server Actions can say something true to the user without
 * forwarding a database message. Anything outside this union collapses into a
 * single fallback — an unrecognised error is not an invitation to improvise.
 */
export type DevelopmentTemplateAuthoringErrorCode =
  | "DEVELOPMENT_TEMPLATE_NOT_AVAILABLE"
  | "DEVELOPMENT_TEMPLATE_VERSION_NOT_EDITABLE"
  | "DEVELOPMENT_TEMPLATE_GOAL_NOT_AVAILABLE"
  | "DEVELOPMENT_TEMPLATE_NO_PUBLISHED_VERSION"
  | "DEVELOPMENT_TEMPLATE_DRAFT_NOT_READABLE"
