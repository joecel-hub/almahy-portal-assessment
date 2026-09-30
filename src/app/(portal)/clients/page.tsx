import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Search, UserRound } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { listClients } from "@/server/services/directory";
import { loadClientListParams } from "@/lib/lists/search-params";
import { CLIENT_TYPES, CLIENT_TYPE_LABELS } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states";
import { ListToolbar } from "@/components/lists/list-toolbar";
import { LinkPagination, SimpleTable } from "@/components/lists/simple-table";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  await requireSession("client:read");
  const sp = await searchParams;
  const { data, meta } = await listClients(loadClientListParams(sp));

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Individuals and companies the firm represents." />
      <Card className="gap-0 py-0">
        <ListToolbar
          searchLabel="Search name, email or city"
          filters={[
            {
              key: "type",
              label: "Client type",
              allLabel: "All client types",
              options: CLIENT_TYPES.map((t) => ({ value: t, label: CLIENT_TYPE_LABELS[t] })),
            },
          ]}
        />
        <SimpleTable
          caption="Clients"
          rows={data}
          rowKey={(c) => c.id}
          empty={<EmptyState icon={Search} title="No clients match" description="Try another search or filter." />}
          columns={[
            {
              header: "Client",
              cell: (c) => (
                <div className="flex min-w-48 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {c.type === "company" ? <Building2 className="size-4" aria-hidden="true" /> : <UserRound className="size-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.contactName && <p className="text-xs text-muted-foreground">Contact: {c.contactName}</p>}
                  </div>
                </div>
              ),
            },
            { header: "Type", cell: (c) => <Badge variant="secondary">{CLIENT_TYPE_LABELS[c.type]}</Badge>, className: "hidden sm:table-cell" },
            { header: "Email", cell: (c) => <span className="whitespace-nowrap">{c.email}</span>, className: "hidden lg:table-cell" },
            { header: "Phone", cell: (c) => <span className="whitespace-nowrap tabular">{c.phone}</span>, className: "hidden xl:table-cell" },
            { header: "City", cell: (c) => c.city, className: "hidden md:table-cell" },
            { header: "Cases", cell: (c) => <span className="tabular">{c.cases}</span>, className: "text-right" },
            {
              header: "Client since",
              cell: (c) => <span className="whitespace-nowrap text-muted-foreground tabular">{formatDate(c.createdAt)}</span>,
              className: "hidden md:table-cell",
            },
          ]}
        />
        <LinkPagination meta={meta} searchParams={sp} basePath="/clients" />
      </Card>
    </div>
  );
}
