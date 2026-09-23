import { Plus } from "@phosphor-icons/react/dist/ssr";

/** The FAQ list, shared by the landing page and /pricing: grey cards, each with a round dark + that turns into ×. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((f) => (
        // `name` makes the set exclusive: opening one closes the others.
        <details key={f.q} name="faq" className="lp-faq group rounded-2xl bg-muted px-5 sm:px-6">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            {f.q}
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-300 group-open:rotate-45"
            >
              <Plus size={14} weight="bold" />
            </span>
          </summary>
          <p className="pb-5 text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
