"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy-loads the wizard in the browser only:
 *  - its code (forms, validation) is a separate chunk, not part of the list page;
 *  - it restores a draft from localStorage on first render, which only exists
 *    in the browser, so server-rendering it would produce mismatched HTML.
 */
export const NewCaseLoader = dynamic(() => import("./new-case-wizard").then((m) => m.NewCaseWizard), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]" aria-busy="true" aria-label="Loading form">
      <div className="flex gap-2 lg:flex-col">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-28 lg:w-full" />
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  ),
});
