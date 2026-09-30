import { requireSession } from "@/server/auth/session";
import { SessionProvider } from "@/components/session-provider";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

/**
 * Shell for every signed-in page. A Server Component: it verifies the session
 * on the server (defence in depth behind proxy.ts) and passes the result down,
 * so the interactive pieces (nav, user menu) never fetch "who am I".
 */
export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  return (
    <SessionProvider session={session}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
          <div className="px-6 py-5">
            <Brand />
          </div>
          <SidebarNav />
          <p className="mt-auto px-6 py-4 text-xs text-muted-foreground">
            Demo data only · Not affiliated with Almahy
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
            <MobileNav />
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
