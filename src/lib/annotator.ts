/**
 * Who gets the annotation tool. It's a feedback channel between Pranjal and
 * the coding agent, not a product feature, so it's gated to an explicit list
 * rather than a plan or a flag. Checked in the layout (to render it) and again
 * in every annotation action (to enforce it).
 */
export const ANNOTATOR_EMAILS = ["pranjalupa@gmail.com"];

/**
 * Master switch. Off 2026-09-14, back on 2026-09-18 for pranjalupa@gmail.com.
 * Set to false to hide the tool again without deleting anything.
 */
export const ANNOTATIONS_ENABLED = true;

export function isAnnotator(email: string | null | undefined) {
  return ANNOTATIONS_ENABLED && !!email && ANNOTATOR_EMAILS.includes(email.toLowerCase());
}
