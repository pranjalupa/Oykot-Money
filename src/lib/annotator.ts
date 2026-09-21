/**
 * Who gets the annotation tool. It's a feedback channel between Pranjal and
 * the coding agent, not a product feature, so it's gated to an explicit list
 * rather than a plan or a flag. Checked in the layout (to render it) and again
 * in every annotation action (to enforce it).
 */
export const ANNOTATOR_EMAILS = ["pranjalupa@gmail.com"];

/**
 * Master switch. Toggled a few times through 2026-09; off again at the end of
 * 2026-09-21. Nothing is deleted when it's off — the table, saved notes and
 * every action stay exactly as they are.
 * Set to false to hide the tool again without deleting anything.
 */
export const ANNOTATIONS_ENABLED = false;

export function isAnnotator(email: string | null | undefined) {
  return ANNOTATIONS_ENABLED && !!email && ANNOTATOR_EMAILS.includes(email.toLowerCase());
}
