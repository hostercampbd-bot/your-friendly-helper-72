import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/licenses": "Licenses",
  "/orders": "Orders",
  "/customers": "Customers",
  "/products": "Products",
  "/settings": "Settings",
};

function Layout() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const title =
    Object.entries(TITLES).find(([p]) => path.startsWith(p))?.[1] ?? "Admin";

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <div
        className="relative flex min-h-screen w-full bg-background text-foreground"
        style={
          {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "3.25rem",
          } as React.CSSProperties
        }
      >
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-mesh" />
        <AppSidebar />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/75 px-4 backdrop-blur-xl md:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex flex-1 items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-sm font-semibold tracking-tight text-muted-foreground">
                  <span className="text-foreground">{title}</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right text-xs leading-tight sm:block">
                  <div className="font-medium text-foreground">{user?.email}</div>
                  <div className="text-[11px] text-muted-foreground">Signed in</div>
                </div>
                <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-semibold text-primary-foreground shadow-glow sm:flex">
                  {user?.email?.[0]?.toUpperCase() ?? "A"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
