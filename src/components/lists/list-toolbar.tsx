"use client";

import { useState, useTransition } from "react";
import { debounce, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type Filter = { key: string; label: string; options: { value: string; label: string }[]; allLabel: string };

type ListToolbarProps = {
  /** Omit to hide the search box. */
  searchLabel?: string;
  filters?: Filter[];
  children?: React.ReactNode;
};

/**
 * Search + filters for the server-rendered list pages. Changes update the URL
 * non-shallowly inside a transition: the Server Component re-renders with the
 * new results while the current ones stay visible. Typing is debounced so the
 * server is not asked for every keystroke.
 */
export function ListToolbar({ searchLabel, filters = [], children }: ListToolbarProps) {
  const [isPending, startTransition] = useTransition();
  const parsers = {
    q: parseAsString.withDefault(""),
    page: parseAsInteger,
    ...Object.fromEntries(filters.map((f) => [f.key, parseAsString])),
  };
  const [state, setParams] = useQueryStates(parsers, { shallow: false, startTransition });
  // Filter keys are dynamic, so read them through a plain record.
  const params = state as Record<string, string | number | null>;
  const [q, setQ] = useState(params.q as string);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      {searchLabel && (
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label={searchLabel}
            placeholder={`${searchLabel}…`}
            className="pl-9"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              void setParams({ q: e.target.value || null, page: null }, { limitUrlUpdates: debounce(350) });
            }}
          />
        </div>
      )}
      {filters.map((f) => (
        <div key={f.key} className="w-full sm:w-48">
          <NativeSelect
            aria-label={f.label}
            value={(params[f.key] as string | null) ?? ""}
            onChange={(e) => void setParams({ [f.key]: e.target.value || null, page: null })}
          >
            <option value="">{f.allLabel}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
      {children}
      <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        {isPending && (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Updating…
          </>
        )}
      </span>
    </div>
  );
}
