"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/domain";
import { useSession } from "@/components/session-provider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      toast.error("Could not sign out. Please try again.");
      return;
    }
    queryClient.clear(); // drop cached data so the next user never sees it
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`Account menu for ${session.name}`}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials(session.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{session.name}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABELS[session.role]}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{session.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{session.email}</span>
          <Badge variant="secondary" className="mt-2">
            {ROLE_LABELS[session.role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
