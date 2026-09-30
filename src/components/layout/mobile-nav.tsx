"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** Below the lg breakpoint the sidebar becomes a slide-in sheet. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu />
        </Button>
      </DialogTrigger>
      <SheetContent side="left" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="px-6 py-5">
          <Brand />
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Dialog>
  );
}
