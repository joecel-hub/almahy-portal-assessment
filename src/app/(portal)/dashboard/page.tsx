import type { Metadata } from "next";
import { requireSession } from "@/server/auth/session";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession("dashboard:view");
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        description="Analytics for cases, clients and consultations."
      />
    </div>
  );
}
