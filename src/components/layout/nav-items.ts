import {
  Briefcase,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/cases", label: "Cases", icon: Briefcase, permission: "case:read" },
  { href: "/clients", label: "Clients", icon: Users, permission: "client:read" },
  { href: "/consultations", label: "Consultations", icon: CalendarClock, permission: "case:read" },
  { href: "/documents", label: "Documents", icon: FileText, permission: "case:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "dashboard:view" },
];
