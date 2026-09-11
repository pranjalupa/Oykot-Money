-- Row Level Security for Oykot Money.
--
-- Defence in depth. The app connects as the table owner, so these policies do
-- NOT constrain Drizzle queries — isolation there is enforced in application
-- code (see lib/auth.ts and lib/budget.ts, where every query filters on the
-- session user's id). These policies are what protect the data if anything
-- ever reaches it through PostgREST / the Supabase client with a user JWT.
--
-- Run after `npm run db:push`:
--   psql "$DATABASE_URL" -f drizzle/rls.sql

alter table public.accounts       enable row level security;
alter table public.categories     enable row level security;
alter table public.group_targets  enable row level security;
alter table public.budget_lines   enable row level security;
alter table public.transactions    enable row level security;
alter table public.merchant_rules  enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.people          enable row level security;
alter table public.profiles        enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.subscriptions   enable row level security;

-- One policy per table: you touch your rows, nobody else's.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'group_targets',
    'budget_lines', 'transactions', 'merchant_rules', 'recurring_rules',
    'people', 'profiles', 'net_worth_snapshots',
    'subscriptions'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I
         for all
         to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t || '_owner', t
    );
  end loop;
end $$;

-- Anonymous callers get nothing at all.
revoke all on public.accounts, public.categories, public.group_targets,
              public.budget_lines, public.transactions, public.merchant_rules,
              public.recurring_rules, public.people, public.profiles,
              public.net_worth_snapshots, public.subscriptions
  from anon;
