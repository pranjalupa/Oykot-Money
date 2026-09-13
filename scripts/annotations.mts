/**
 * Read and act on the annotations left through the in-app tool — this is how
 * the coding agent "checks the annotations".
 *
 *   npx tsx scripts/annotations.mts list [open|resolved|all]
 *   npx tsx scripts/annotations.mts show <id>
 *   npx tsx scripts/annotations.mts reply <id> "text"       (shown under the note in the app)
 *   npx tsx scripts/annotations.mts resolve <id> ["reply"]
 *   npx tsx scripts/annotations.mts reopen <id>
 *   npx tsx scripts/annotations.mts delete <id>
 *
 * <id> can be the short 8-character prefix that `list` prints.
 * Scoped to ANNOTATOR_EMAIL (default pranjalupa@gmail.com).
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { max: 1, onnotice: () => {} });
const email = process.env.ANNOTATOR_EMAIL ?? "pranjalupa@gmail.com";
const [cmd = "list", arg, text] = process.argv.slice(2);

try {
  const [user] = await sql`select id from auth.users where lower(email) = ${email.toLowerCase()}`;
  if (!user) throw new Error(`No account for ${email}`);
  const uid = user.id as string;

  async function find(prefix: string | undefined) {
    if (!prefix) throw new Error("Pass an annotation id");
    const rows = await sql`
      select * from annotations
      where user_id = ${uid} and id::text like ${prefix.toLowerCase() + "%"}`;
    if (rows.length === 0) throw new Error(`No annotation matching ${prefix}`);
    if (rows.length > 1) throw new Error(`${prefix} matches ${rows.length} annotations — use more characters`);
    return rows[0];
  }

  const describe = (a: postgres.Row, full = false) => {
    const target = a.selected_text
      ? `selected “${a.selected_text}”`
      : `<${a.tag_name ?? "?"}> ${a.element_text ? `“${String(a.element_text).slice(0, full ? 500 : 90)}”` : ""}`;
    const lines = [
      `${String(a.id).slice(0, 8)}  [${a.status}]  ${a.path}  ·  ${new Date(a.created_at).toISOString().slice(0, 16).replace("T", " ")}`,
      `  on:    ${target}`,
      `  note:  ${a.note}`,
    ];
    if (a.reply) lines.push(`  reply: ${a.reply}`);
    if (full) {
      lines.push(
        `  id:        ${a.id}`,
        `  page:      ${a.page_title ?? ""}`,
        `  selector:  ${a.selector}`,
        `  viewport:  ${a.viewport_width ?? "?"}px, ${a.theme ?? "?"} theme`,
      );
    }
    return lines.join("\n");
  };

  if (cmd === "list") {
    const status = arg ?? "open";
    const rows =
      status === "all"
        ? await sql`select * from annotations where user_id = ${uid} order by created_at`
        : await sql`select * from annotations where user_id = ${uid} and status = ${status} order by created_at`;
    console.log(rows.length ? rows.map((a) => describe(a)).join("\n\n") : `No ${status} annotations.`);
  } else if (cmd === "show") {
    console.log(describe(await find(arg), true));
  } else if (cmd === "reply") {
    const a = await find(arg);
    if (!text) throw new Error("Pass the reply text");
    await sql`update annotations set reply = ${text}, updated_at = now() where id = ${a.id}`;
    console.log(`Replied to ${String(a.id).slice(0, 8)}`);
  } else if (cmd === "resolve" || cmd === "reopen") {
    const a = await find(arg);
    const status = cmd === "resolve" ? "resolved" : "open";
    await sql`
      update annotations
      set status = ${status},
          resolved_at = ${status === "resolved" ? sql`now()` : null},
          reply = coalesce(${text ?? null}, reply),
          updated_at = now()
      where id = ${a.id}`;
    console.log(`${status === "resolved" ? "Resolved" : "Reopened"} ${String(a.id).slice(0, 8)}`);
  } else if (cmd === "delete") {
    const a = await find(arg);
    await sql`delete from annotations where id = ${a.id}`;
    console.log(`Deleted ${String(a.id).slice(0, 8)}`);
  } else {
    throw new Error(`Unknown command ${cmd}`);
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
