"use client";

import { useId, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EditableCardProps = {
  title: string;
  canEdit: boolean;
  /** Read-only view. */
  children: React.ReactNode;
  /** Edit form; call `close()` after saving or cancelling. */
  renderForm: (close: () => void) => React.ReactNode;
};

/**
 * A card that switches between a read view and an inline edit form.
 * Focus management: the form's first field autofocuses on open, and focus
 * returns to the Edit button on close, so keyboard users never get lost.
 */
export function EditableCard({ title, canEdit, children, renderForm }: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const editButtonId = useId();

  function close() {
    setEditing(false);
    // After the read view re-renders, put focus back on its Edit button.
    requestAnimationFrame(() => document.getElementById(editButtonId)?.focus());
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {canEdit && !editing && (
          <Button id={editButtonId} variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Edit <span className="sr-only">{title.toLowerCase()}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>{editing ? renderForm(close) : children}</CardContent>
    </Card>
  );
}

/** Two-column label/value list used by read views. */
export function DetailList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.label}</dt>
          <dd className="text-sm">{item.value ?? <span className="text-muted-foreground">Not set</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
