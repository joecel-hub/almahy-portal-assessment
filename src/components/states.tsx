import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StateProps = {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
};

/** Shown when a list or section has nothing to display. Always offers a next step. */
export function EmptyState({ title, description, action, icon: Icon = Inbox, className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Shown when loading failed. `role="alert"` announces it to screen readers. */
export function ErrorState({ title = "Something went wrong", description, action, className }: Partial<StateProps>) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
