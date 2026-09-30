"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

/**
 * Client-side providers, mounted once in the root layout.
 *
 * - TanStack Query owns *server state* (cached API data).
 * - nuqs keeps list filters in the URL (the URL is the source of truth).
 * - sonner renders toasts inside an aria-live region.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useState (not a module-level constant) so each request/user gets its own
  // cache during SSR and the client is created exactly once in the browser.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // data is "fresh" for 30s: no refetch on remount/focus inside that window
            gcTime: 5 * 60_000, // unused cache entries are kept for 5 min for instant back-navigation
            retry: (failureCount, error) => {
              // Never retry auth/permission/validation errors; retry transient ones twice.
              const status = (error as { status?: number }).status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
