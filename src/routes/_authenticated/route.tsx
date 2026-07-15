import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const router = useRouter();
  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/_authenticated/dashboard" className="font-semibold">License Panel</Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link to="/_authenticated/dashboard" activeProps={{ className: "text-foreground font-medium" }}>Dashboard</Link>
              <Link to="/_authenticated/licenses" activeProps={{ className: "text-foreground font-medium" }}>Licenses</Link>
              <Link to="/_authenticated/orders" activeProps={{ className: "text-foreground font-medium" }}>Orders</Link>
              <Link to="/_authenticated/customers" activeProps={{ className: "text-foreground font-medium" }}>Customers</Link>
              <Link to="/_authenticated/products" activeProps={{ className: "text-foreground font-medium" }}>Products</Link>
              <Link to="/_authenticated/settings" activeProps={{ className: "text-foreground font-medium" }}>Settings</Link>
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6"><Outlet /></main>
    </div>
  );
}
