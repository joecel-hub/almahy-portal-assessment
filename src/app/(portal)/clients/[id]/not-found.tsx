import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states";

export default function ClientNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Client not found"
      description="The link may be incorrect."
      action={
        <Button asChild variant="outline">
          <Link href="/clients">Back to clients</Link>
        </Button>
      }
    />
  );
}
