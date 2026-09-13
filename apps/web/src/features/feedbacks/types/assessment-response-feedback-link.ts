/**
 * Whether an assessment response already carries its formal Feedback thread.
 *
 * Three states, not two. "No thread" and "I could not find out" are different
 * facts, and the surface must be able to tell them apart: the first is the
 * normal precondition for offering authorship, the second is a read failure.
 * Collapsing them would either hide the call to action whenever the database
 * hiccups, or — much worse — offer it as though absence had been proven.
 *
 * Lives outside the query module so client components can name it without
 * importing a `server-only` file.
 */
export type AssessmentResponseFeedbackLink =
  | Readonly<{ status: "no_formal_feedback" }>
  | Readonly<{ status: "existing_formal_feedback"; threadId: string }>
  | Readonly<{ status: "unavailable" }>
