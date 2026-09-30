import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card className="gap-0 py-0">
        <div className="flex gap-2 border-b p-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-48" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-32 md:block" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </Card>
    </div>
  );
}
