"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { annotations, ANNOTATION_STATUSES, type AnnotationStatus } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { isAnnotator } from "@/lib/annotator";

export type Annotation = typeof annotations.$inferSelect;

export type NewAnnotation = {
  path: string;
  pageTitle: string | null;
  selector: string;
  tagName: string | null;
  elementText: string | null;
  selectedText: string | null;
  note: string;
  viewportWidth: number | null;
  theme: string | null;
};

/** Same gate as the layout — rendering the tool isn't the same as being allowed to use it. */
async function requireAnnotator() {
  const user = await getUser();
  if (!user || !isAnnotator(user.email)) throw new Error("Annotations aren't enabled for this account");
  return user;
}

const clip = (s: unknown, n: number) => (typeof s === "string" && s.trim() ? s.trim().slice(0, n) : null);

function clean(input: NewAnnotation) {
  const note = clip(input.note, 4000);
  const selector = clip(input.selector, 2000);
  const path = clip(input.path, 1000);
  if (!note) throw new Error("Write a note first");
  if (!selector || !path?.startsWith("/")) throw new Error("Nothing selected");
  return {
    path,
    selector,
    note,
    pageTitle: clip(input.pageTitle, 300),
    tagName: clip(input.tagName, 40),
    elementText: clip(input.elementText, 500),
    selectedText: clip(input.selectedText, 1000),
    viewportWidth: Number.isInteger(input.viewportWidth) ? input.viewportWidth : null,
    theme: clip(input.theme, 10),
  };
}

export async function listAnnotations(): Promise<Annotation[]> {
  const user = await requireAnnotator();
  return db
    .select()
    .from(annotations)
    .where(eq(annotations.userId, user.id))
    .orderBy(desc(annotations.createdAt));
}

export async function createAnnotation(input: NewAnnotation): Promise<Annotation> {
  const user = await requireAnnotator();
  const [row] = await db
    .insert(annotations)
    .values({ ...clean(input), userId: user.id })
    .returning();
  return row;
}

export async function updateAnnotationNote(id: string, note: string) {
  const user = await requireAnnotator();
  const text = clip(note, 4000);
  if (!text) throw new Error("A note can't be empty");
  await db
    .update(annotations)
    .set({ note: text, updatedAt: new Date() })
    .where(and(eq(annotations.id, id), eq(annotations.userId, user.id)));
}

export async function setAnnotationStatus(id: string, status: AnnotationStatus) {
  const user = await requireAnnotator();
  if (!ANNOTATION_STATUSES.includes(status)) throw new Error("Unknown status");
  await db
    .update(annotations)
    .set({ status, resolvedAt: status === "resolved" ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(annotations.id, id), eq(annotations.userId, user.id)));
}

export async function deleteAnnotation(id: string) {
  const user = await requireAnnotator();
  await db.delete(annotations).where(and(eq(annotations.id, id), eq(annotations.userId, user.id)));
}

/** Puts a deleted annotation back exactly as it was — the other half of undo. */
export async function restoreAnnotation(row: Annotation) {
  const user = await requireAnnotator();
  await db
    .insert(annotations)
    .values({
      ...clean(row),
      id: row.id,
      userId: user.id,
      reply: clip(row.reply, 4000),
      status: row.status === "resolved" ? "resolved" : "open",
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(),
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    })
    .onConflictDoNothing();
}
