# Oykot-Money — Agent Context

Read this file first, every session. It's the persistent memory for this repo — any LLM
working here should treat it as source of truth for decisions, trajectory, and status.

## Rules for LLMs editing this file (token-efficiency strategy)
- **Append, don't rewrite.** New entries go at the top of "Decisions & Updates," newest first.
- **Bullets, not prose.** One line per fact. No recaps, no restating what git history already shows.
- **Don't duplicate the code.** Stack/config facts belong here only if they're *decisions*
  (why we picked X), not facts derivable from package.json, file tree, or configs — link instead.
- **Keep this file short.** Target under ~150 lines. When it grows past that, move old
  "Decisions & Updates" entries into `/docs/decisions/YYYY-MM.md` and leave a one-line
  pointer here. Never delete decisions, just archive them.
- **Update `Status` every session** you touch code — one or two lines, current state only.

## What this is
- Pranjal's personal budgeting tool. Personal/single-user for now.
- Possible future: turn into a SaaS or public app. Not committed to — see trajectory below.
- Owner/account: github.com/pranjalupa

## Stack decisions (current — supersede below when changed, don't leave stale entries here)
- **UI library:** shadcn/ui — primary UI kit for the whole project.
  - Icons: **Phosphor Icons**
  - Fonts: **Archivo** (headings) · **Inter** (body/UI) · **Instrument Sans Italic** (accent —
    pull quotes / insight callouts only, never buttons/nav/labels — ration its use)
  - Radius: **Medium** (0.5rem base)
  - Color system: custom token set (not the stock shadcn theme) — 4 scales: Forest (primary,
    anchor `#004437`), Lemon (accent, anchor `#DAF546`, same hue in light + dark on purpose),
    Sand (neutral, anchors `#F7F7F7` / `#E1F3E5` / `#272727`), Clay (destructive, proposed —
    not in the original swatch, `#C1543F` anchor). Full scale + semantic token mapping (light
    & dark) drafted here, pending confirmation before it lands in `globals.css`:
    https://claude.ai/code/artifact/dbed95ef-b818-4332-ad6e-60a02c65f915
  - Dark mode swaps primary/accent emphasis: forest loses contrast on a near-black green bg,
    so lemon carries primary actions in dark mode instead of forest.
  - Type scale has separate Web/Mobile sizes; body text holds at 16px on both (accessibility floor).
  - Reason: consistency across UI as the project grows from personal tool → possible app.
- **Framework / backend / database:** not decided yet
- **Hosting:** not decided yet (Vercel is the likely default given tooling on hand, not confirmed)

## Product trajectory
- **Phase 1 (current):** personal budgeting tool, single user, brainstorming/planning only — no code yet.
- **Phase 2 (future, unscheduled):** possible SaaS / multi-user product. Do not build for this
  prematurely — Phase 1 decisions should stay simple and not pre-optimize for multi-tenancy.

## Decisions & Updates (newest first — add new entries at top)
- 2026-09-01 — Replaced the shadcn stock-preset approach with a custom color/type token system
  built from a 5-color swatch (Dark Green/Gray/Lemon Yellow/White/Black) + Archivo/Inter/
  Instrument Sans Italic. Drafted as an interactive artifact (light/dark, web/mobile toggles)
  for review before committing exact values to code. Superseded the earlier `b2BX1ejq4` preset
  font choice (was Inter/Inter) — now Archivo/Inter/Instrument Sans Italic.
- 2026-09-01 — Repo created (private, github.com/pranjalupa/Oykot-Money). Chose shadcn/ui
  preset `b2BX1ejq4` for UI consistency. This AGENTS.md created as the persistent context file.
  Project is in brainstorming phase — no code written yet.

## Status
- No code yet. Color/type token system drafted, awaiting review. Brainstorming/planning phase.
