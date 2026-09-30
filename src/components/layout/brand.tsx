import Link from "next/link";
import { Scale } from "lucide-react";

export function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Scale className="size-4" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Almahy</span>
        <span className="block text-xs text-muted-foreground">Management Portal</span>
      </span>
    </Link>
  );
}
