import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { listAssignees } from "@/server/services/cases";
import { listClientOptions } from "@/server/services/case-create";
import { PageHeader } from "@/components/page-header";
import { NewCaseLoader } from "@/components/cases/new/new-case-loader";

export const metadata: Metadata = { title: "New case" };

export default async function NewCasePage() {
  // Viewers are redirected; the API enforces the same permission on submit.
  await requireSession("case:create");
  const [clients, assignees] = await Promise.all([listClientOptions(), listAssignees()]);

  return (
    <div className="space-y-6">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All cases
      </Link>
      <PageHeader title="New case" description="Open a new matter in four short steps. Your progress is saved as a draft." />
      <NewCaseLoader clients={clients} assignees={assignees} />
    </div>
  );
}
