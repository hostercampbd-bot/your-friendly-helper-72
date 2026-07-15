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
  const linkCls = "text-muted-foreground hover:text-foreground";
  const activeCls = { className: "text-foreground font-medium" };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="font-semibold">License Panel</Link>
            <nav className="flex gap-4 text-sm">
              <Link to="/dashboard" className={linkCls} activeProps={activeCls}>Dashboard</Link>
              <Link to="/licenses" className={linkCls} activeProps={activeCls}>Licenses</Link>
              <Link to="/orders" className={linkCls} activeProps={activeCls}>Orders</Link>
              <Link to="/customers" className={linkCls} activeProps={activeCls}>Customers</Link>
              <Link to="/products" className={linkCls} activeProps={activeCls}>Products</Link>
              <Link to="/settings" className={linkCls} activeProps={activeCls}>Settings</Link>
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6"><Outlet /></main>
    </div>
  );
}
