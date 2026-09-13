import type { GroupKey } from "@/db/schema";

/**
 * Chart colour for a group. Income isn't part of the three-way spending
 * palette — it's the one measure that isn't a slice of the others — so it
 * takes the brand primary instead.
 *
 * Lives here rather than beside the charts because the pages that draw them
 * are server components: a plain function exported from a "use client"
 * module can be rendered, but not called, on the server.
 */
export const groupColor = (g: GroupKey) => (g === "income" ? "var(--primary)" : `var(--chart-${g})`);
