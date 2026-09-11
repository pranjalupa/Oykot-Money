# Oykot Money

Budgeting on the 50/30/20 idea — set a budget for each category every month, log what
actually happens, and see what's left. Live at https://oykot-money.vercel.app.

- **What it does** — [`PRODUCT.md`](PRODUCT.md): screens, rules, calculations, known gaps,
  and the plan for going paid.
- **How it's built, and why** — [`AGENTS.md`](AGENTS.md). Read it before changing code.

## Run it locally

```bash
vercel env pull .env.local   # Supabase keys and the database URL
npm install
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push `src/db/schema.ts` to the database. It diffs the **whole** schema — review what it proposes before accepting |
| `npm run db:studio` | Browse the database |

After adding a table, add it to `drizzle/rls.sql` and re-run that file — it doesn't pick up
new tables on its own.
