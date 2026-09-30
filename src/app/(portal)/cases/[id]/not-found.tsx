import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states";

export default function CaseNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Case not found"
      description="It may have been deleted, or the link is incorrect."
      action={
        <Button asChild variant="outline">
          <Link href="/cases">Back to cases</Link>
        </Button>
      }
    />
  );
}
