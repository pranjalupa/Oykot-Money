"use client";

import { useActionState, useState } from "react";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { updateProfile, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/currency-select";
import { RegionSelect } from "@/components/region-select";
import type { RegionCode } from "@/lib/region";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

export function ProfileForm({
  name,
  currency,
  region,
}: {
  name: string;
  currency: CurrencyCode;
  region: RegionCode;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateProfile,
    null,
  );
  // Tracked only to show the warning below before you save — not to submit.
  const [picked, setPicked] = useState<CurrencyCode>(currency);
  const changing = picked !== currency;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={name}
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-currency">Currency</Label>
          <CurrencySelect
            id="profile-currency"
            defaultValue={currency}
            onChange={(e) => setPicked(e.target.value as CurrencyCode)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-region">Date format</Label>
          <RegionSelect id="profile-region" defaultValue={region} />
        </div>
      </div>

      {/* Said before saving, not after: relabelling every number you've entered
          is the kind of surprise that should never be discovered. */}
      {changing ? (
        <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-muted-foreground" />
          <span>
            Nothing is converted — every amount keeps its number and only the symbol
            changes, so {CURRENCIES[currency].symbol}500 becomes{" "}
            {CURRENCIES[picked].symbol}500.
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Changes the symbol and number format everywhere. Amounts are never converted.
        </p>
      )}

      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state?.ok && !changing && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          Saved.
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
