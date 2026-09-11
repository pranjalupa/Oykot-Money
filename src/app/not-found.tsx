import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass size={24} weight="duotone" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-bold">Nothing here</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        That page doesn&rsquo;t exist, or it belongs to something you&rsquo;ve deleted.
      </p>
      <Link href="/" className={`${buttonVariants()} mt-6`}>
        Go home
      </Link>
    </div>
  );
}
