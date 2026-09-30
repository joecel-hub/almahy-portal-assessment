import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

// Temporary landing page for the scaffold; replaced by a redirect to /dashboard
// once authentication is in place.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Scale aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Almahy Management Portal</h1>
        <p className="text-muted-foreground">
          Internal portal for clients, cases and consultations.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard">
          Open dashboard <ArrowRight />
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        Technical assessment demo. Not affiliated with Almahy. All data is fictional.
      </p>
    </main>
  );
}
