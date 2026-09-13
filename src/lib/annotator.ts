/**
 * Who gets the annotation tool. It's a feedback channel between Pranjal and
 * the coding agent, not a product feature, so it's gated to an explicit list
 * rather than a plan or a flag. Checked in the layout (to render it) and again
 * in every annotation action (to enforce it).
 */
export const ANNOTATOR_EMAILS = ["pranjalupa@gmail.com"];

export function isAnnotator(email: string | null | undefined) {
  return !!email && ANNOTATOR_EMAILS.includes(email.toLowerCase());
}
