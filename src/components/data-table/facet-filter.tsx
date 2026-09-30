"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FacetFilterProps<V extends string> = {
  label: string;
  options: readonly V[];
  labels: Record<V, string>;
  value: V[];
  onChange: (next: V[]) => void;
};

/** Multi-select filter in a keyboard-navigable menu. Stays open while toggling options. */
export function FacetFilter<V extends string>({ label, options, labels, value, onChange }: FacetFilterProps<V>) {
  function toggle(option: V, checked: boolean) {
    // Keep the canonical option order so the URL (and cache key) is stable.
    onChange(options.filter((o) => (o === option ? checked : value.includes(o))));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          {label}
          {value.length > 0 && (
            <Badge variant="secondary" className="px-1.5">
              <span className="sr-only">, </span>
              {value.length}
              <span className="sr-only"> selected</span>
            </Badge>
          )}
          <ChevronDown className="opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={value.includes(option)}
            onCheckedChange={(checked) => toggle(option, checked === true)}
            onSelect={(e) => e.preventDefault()}
          >
            {labels[option]}
          </DropdownMenuCheckboxItem>
        ))}
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])} className="justify-center">
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
