"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states";

/**
 * Error boundary for every portal page. A crash in one page shows this panel
 * inside the shell (navigation keeps working) instead of a blank screen, and
 * "Try again" re-renders the segment without a full reload.
 */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This page couldn't be loaded"
      description={
        error.digest ? `Something went wrong on our side (reference ${error.digest}).` : "Something went wrong."
      }
      action={
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
