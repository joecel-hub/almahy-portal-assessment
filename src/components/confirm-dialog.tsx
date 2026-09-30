"use client";

import { AlertDialog } from "radix-ui";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
};

/**
 * Confirmation for irreversible actions. Uses the ARIA `alertdialog` pattern:
 * focus starts on Cancel (the safe choice), Escape cancels, focus returns to
 * the element that opened it.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-6 shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="space-y-2">
            <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">{description}</AlertDialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel className={buttonVariants({ variant: "outline" })} disabled={pending}>
              Cancel
            </AlertDialog.Cancel>
            {/* A plain Button (not AlertDialog.Action) so the dialog does not close before the caller decides. */}
            <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
