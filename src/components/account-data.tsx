"use client";

import { useActionState, useState } from "react";
import { DownloadSimple, Trash, Warning } from "@phosphor-icons/react";
import { deleteMyAccount, type ActionResult } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Export and delete — the two things that make "your data is yours" true. */
export function AccountData() {
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteMyAccount, null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {/* A plain <a> on purpose: this is a file download from a route handler,
            which <Link>'s client-side navigation would try to render as a page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/export?format=csv" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <DownloadSimple size={16} weight="bold" />
          Transactions (CSV)
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/export?format=json" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <DownloadSimple size={16} weight="bold" />
          Everything (JSON)
        </a>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium">Delete your account</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Removes your login and everything in it, for good. Export first if you want a copy.
        </p>
        <Dialog onOpenChange={() => setTyped("")}>
          <DialogTrigger render={<Button variant="destructive" size="sm" className="mt-3" />}>
            <Trash size={16} weight="bold" />
            Delete account
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                Every budget, transaction, account and person goes, along with your login. This
                can&rsquo;t be undone.
              </DialogDescription>
            </DialogHeader>
            <form action={action} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
                <Input
                  id="confirm-delete"
                  name="confirm"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                />
              </div>
              {state && !state.ok && (
                <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
                  {state.error}
                </p>
              )}
              <Button type="submit" variant="destructive" disabled={pending || typed.trim() !== "DELETE"}>
                {pending ? "Deleting…" : "Delete everything"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
