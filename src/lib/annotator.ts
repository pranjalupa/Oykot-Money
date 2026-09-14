/**
 * Who gets the annotation tool. It's a feedback channel between Pranjal and
 * the coding agent, not a product feature, so it's gated to an explicit list
 * rather than a plan or a flag. Checked in the layout (to render it) and again
 * in every annotation action (to enforce it).
 */
export const ANNOTATOR_EMAILS = ["pranjalupa@gmail.com"];

/**
 * Off since 2026-09-14 — the tool is kept, just not rendered or accepted.
 * Flip to true to bring it back; the code, table and saved notes are intact.
 */
export const ANNOTATIONS_ENABLED = false;

export function isAnnotator(email: string | null | undefined) {
  return ANNOTATIONS_ENABLED && !!email && ANNOTATOR_EMAILS.includes(email.toLowerCase());
}
