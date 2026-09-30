import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Streams instantly while the Server Component queries the database. */
export default function CasesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading cases">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card className="gap-0 py-0">
        <div className="flex gap-2 border-b p-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-32 md:block" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </Card>
    </div>
  );
}
