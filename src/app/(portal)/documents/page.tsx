import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { listDocuments } from "@/server/services/directory";
import { loadDocumentListParams } from "@/lib/lists/search-params";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABELS } from "@/lib/domain";
import { formatDate, formatFileSize } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states";
import { ListToolbar } from "@/components/lists/list-toolbar";
import { LinkPagination, SimpleTable } from "@/components/lists/simple-table";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  await requireSession("case:read");
  const sp = await searchParams;
  const { data, meta } = await listDocuments(loadDocumentListParams(sp));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Every file attached to a case. (Demo: file metadata only; no files are stored.)"
      />
      <Card className="gap-0 py-0">
        <ListToolbar
          searchLabel="Search file name or case ref"
          filters={[
            {
              key: "kind",
              label: "Document type",
              allLabel: "All document types",
              options: DOCUMENT_KINDS.map((k) => ({ value: k, label: DOCUMENT_KIND_LABELS[k] })),
            },
          ]}
        />
        <SimpleTable
          caption="Documents"
          rows={data}
          rowKey={(d) => d.id}
          empty={<EmptyState icon={Search} title="No documents match" description="Try another search or type." />}
          columns={[
            {
              header: "Document",
              cell: (d) => (
                <div className="flex items-center gap-3 sm:min-w-52">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="font-medium break-all sm:break-normal">{d.name}</span>
                </div>
              ),
            },
            { header: "Type", cell: (d) => <Badge variant="secondary">{DOCUMENT_KIND_LABELS[d.kind]}</Badge>, className: "hidden sm:table-cell" },
            {
              header: "Case",
              cell: (d) => (
                <Link href={`/cases/${d.caseId}`} className="font-mono text-xs hover:underline" title={d.caseTitle}>
                  {d.caseRef}
                </Link>
              ),
            },
            { header: "Size", cell: (d) => <span className="tabular">{formatFileSize(d.sizeKb)}</span>, className: "hidden md:table-cell text-right" },
            { header: "Uploaded by", cell: (d) => d.uploadedBy ?? "–", className: "hidden lg:table-cell" },
            { header: "Uploaded", cell: (d) => <span className="whitespace-nowrap tabular">{formatDate(d.uploadedAt)}</span>, className: "hidden md:table-cell" },
          ]}
        />
        <LinkPagination meta={meta} searchParams={sp} basePath="/documents" />
      </Card>
    </div>
  );
}
