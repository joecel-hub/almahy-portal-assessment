import { ArrowDown, ArrowUp, ChevronsUp, Minus } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  type CasePriority,
  type CaseStatus,
} from "@/lib/domain";

const STATUS_VARIANT: Record<CaseStatus, BadgeProps["variant"]> = {
  intake: "info",
  open: "default",
  in_progress: "warning",
  on_hold: "secondary",
  closed: "success",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{CASE_STATUS_LABELS[status]}</Badge>;
}

// Colour is never the only signal: each priority also has an icon and text.
const PRIORITY_STYLE: Record<CasePriority, { icon: typeof Minus; className: string }> = {
  low: { icon: ArrowDown, className: "text-muted-foreground" },
  medium: { icon: Minus, className: "text-foreground" },
  high: { icon: ArrowUp, className: "text-warning" },
  urgent: { icon: ChevronsUp, className: "text-destructive font-medium" },
};

export function PriorityLabel({ priority }: { priority: CasePriority }) {
  const { icon: Icon, className } = PRIORITY_STYLE[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  );
}
