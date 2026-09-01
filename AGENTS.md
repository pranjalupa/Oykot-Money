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
- **UI library:** shadcn/ui, using saved preset `b2BX1ejq4`
  (reopen anytime at https://ui.shadcn.com/create?preset=b2BX1ejq4, or "Open Preset" → paste code)
  - Style: **Nova** · Base color: **Mist** · Theme: **Mist** · Chart color: **Emerald**
  - Heading font: **Inter** · Body font: **Inter** · Icons: **Phosphor**
  - Radius: **Medium** · Menu: **Default/Solid**, accent **Subtle**
  - Reason: consistency across UI as the project grows from personal tool → possible app.
- **Framework / backend / database:** not decided yet
- **Hosting:** not decided yet (Vercel is the likely default given tooling on hand, not confirmed)

## Product trajectory
- **Phase 1 (current):** personal budgeting tool, single user, brainstorming/planning only — no code yet.
- **Phase 2 (future, unscheduled):** possible SaaS / multi-user product. Do not build for this
  prematurely — Phase 1 decisions should stay simple and not pre-optimize for multi-tenancy.

## Decisions & Updates (newest first — add new entries at top)
- 2026-09-01 — Repo created (private, github.com/pranjalupa/Oykot-Money). Chose shadcn/ui
  preset `b2BX1ejq4` for UI consistency. This AGENTS.md created as the persistent context file.
  Project is in brainstorming phase — no code written yet.

## Status
- No code yet. Brainstorming/planning phase only.
