import {
  ArrowRightLeft,
  CalendarPlus,
  FilePlus2,
  Flag,
  MessageSquare,
  PencilLine,
  Sparkles,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/states";
import { formatDateTime } from "@/lib/format";
import type { ActivityType } from "@/lib/domain";
import type { CaseDetail } from "@/lib/cases/detail-types";

const ICONS: Record<ActivityType, LucideIcon> = {
  created: Sparkles,
  status_changed: ArrowRightLeft,
  priority_changed: Flag,
  assigned: UserRoundCheck,
  updated: PencilLine,
  note: MessageSquare,
  document_added: FilePlus2,
  consultation_scheduled: CalendarPlus,
};

/** Chronological history of the case, newest first, as an accessible ordered list. */
export function ActivityTimeline({ items }: { items: CaseDetail["activity"] }) {
  if (items.length === 0) {
    return <EmptyState title="No activity yet" description="Changes to this case will be recorded here." />;
  }
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <li key={item.id} className="relative flex gap-3">
            <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm">{item.message}</p>
              <p className="text-xs text-muted-foreground">
                {item.actorName ?? "System"} · <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
