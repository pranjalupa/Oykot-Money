"use client";

import { useTransition } from "react";
import { CopySimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { copyPlanFromPreviousMonth } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function CopyPlanButton({ month }: { month: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("month", month);
          const res = await copyPlanFromPreviousMonth(fd);
          if (res.ok) toast.success("Copied last month's plan");
          else toast.error(res.error);
        })
      }
    >
      <CopySimple size={16} weight="bold" />
      {pending ? "Copying…" : "Copy last month"}
    </Button>
  );
}
