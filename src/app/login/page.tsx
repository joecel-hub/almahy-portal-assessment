import type { Metadata } from "next";
import { Suspense } from "react";
import { Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { email: "admin@almahy.demo", role: "Administrator: full access, including delete" },
  { email: "manager@almahy.demo", role: "Case manager: create and edit, no delete" },
  { email: "viewer@almahy.demo", role: "Viewer: read-only" },
];

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Scale className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold">Almahy Management Portal</p>
            <p className="text-sm text-muted-foreground">Internal access only</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-lg">Sign in</h1>
            </CardTitle>
            <CardDescription>Use your work email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* useSearchParams (for ?next=) needs a Suspense boundary. */}
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <section aria-labelledby="demo-heading" className="rounded-lg border bg-card p-4 text-sm">
          <h2 id="demo-heading" className="font-medium">
            Demo accounts
          </h2>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <span className="font-mono text-xs text-foreground">{a.email}</span>
                <br />
                <span className="text-xs">{a.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            The demo password is shared with the reviewers separately.
          </p>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Technical assessment demo. Not affiliated with Almahy. All data is fictional.
        </p>
      </div>
    </main>
  );
}
