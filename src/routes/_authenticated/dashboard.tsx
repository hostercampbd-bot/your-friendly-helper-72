import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAll, checkIsAdmin } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Users,
  Package,
  Clock,
  Wallet,
  Activity,
  ArrowUpRight,
  Globe,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — License Panel" }] }),
  component: Dashboard,
});

function Dashboard() {
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listAll);
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });

  if (admin.isLoading) return <DashboardSkeleton />;
  if (admin.isError) {
    return (
      <Card className="max-w-lg border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Dashboard unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {admin.error instanceof Error ? admin.error.message : "Unable to verify administrator access."}
        </CardContent>
      </Card>
    );
  }
  if (!admin.data?.isAdmin) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Not an admin yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You're signed in but don't have admin access. Contact the account administrator to be granted a role.
        </CardContent>
      </Card>
    );
  }
  return <DashboardInner list={list} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-16 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function DashboardInner({ list }: { list: () => Promise<any> }) {
  const q = useQuery({ queryKey: ["all"], queryFn: () => list() });
  if (q.isLoading) return <DashboardSkeleton />;
  const d = q.data;
  const now = Date.now();
  const licenses = d?.licenses ?? [];
  const activations = d?.activations ?? [];
  const orders = d?.orders ?? [];
  const products = d?.products ?? [];
  const customers = d?.customers ?? [];

  const active = licenses.filter((l: any) => l.status === "active").length;
  const suspended = licenses.filter((l: any) => l.status === "suspended").length;
  const expiringSoon = licenses.filter(
    (l: any) =>
      l.expires_at &&
      new Date(l.expires_at).getTime() - now < 1000 * 60 * 60 * 24 * 30 &&
      l.status === "active",
  ).length;
  const revenue = orders
    .filter((o: any) => o.status === "paid")
    .reduce((s: number, o: any) => s + Number(o.amount), 0);

  const stats = [
    {
      label: "Paid revenue",
      value: formatMoney(revenue),
      hint: `${orders.filter((o: any) => o.status === "paid").length} paid orders`,
      icon: Wallet,
      featured: true,
    },
    {
      label: "Active licenses",
      value: active,
      hint: `${licenses.length} total`,
      icon: Activity,
      tint: "text-emerald-500",
    },
    {
      label: "Expiring · 30d",
      value: expiringSoon,
      hint: suspended ? `${suspended} suspended` : "All healthy",
      icon: Clock,
      tint: "text-amber-500",
    },
    {
      label: "Customers",
      value: customers.length,
      hint: `${products.length} products`,
      icon: Users,
      tint: "text-sky-500",
    },
  ];

  const recentActivations = [...activations]
    .sort((a: any, b: any) =>
      new Date(b.last_check_at).getTime() - new Date(a.last_check_at).getTime(),
    )
    .slice(0, 6);

  const recentOrders = [...orders]
    .sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Welcome back"
        description="Snapshot of licenses, customers, and revenue across your products."
        actions={
          <Button asChild size="sm">
            <Link to="/licenses">
              New license <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`relative overflow-hidden border-border/60 shadow-card-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant ${
              s.featured ? "bg-gradient-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {s.featured && (
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            )}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-[11px] font-medium uppercase tracking-[0.14em] ${
                  s.featured ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  s.featured
                    ? "bg-white/15 text-primary-foreground"
                    : `bg-muted ${s.tint ?? "text-primary"}`
                }`}
              >
                <s.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-semibold tracking-tight">
                {s.value}
              </div>
              <p
                className={`mt-1 text-xs ${
                  s.featured ? "text-primary-foreground/75" : "text-muted-foreground"
                }`}
              >
                {s.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 shadow-card-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-base">Recent activations</CardTitle>
              <p className="text-xs text-muted-foreground">Latest domains checking in.</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/licenses">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivations.length === 0 && (
              <EmptyRow icon={Globe} label="No activations yet" hint="They'll appear as plugins call activate." />
            )}
            {recentActivations.map((a: any) => {
              const lic = licenses.find((l: any) => l.id === a.license_id);
              const prod = products.find((p: any) => p.id === lic?.product_id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-medium">{a.domain}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {prod?.name ?? "—"} · {new Date(a.last_check_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider">
                    {lic?.status ?? "unknown"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-base">Recent orders</CardTitle>
              <p className="text-xs text-muted-foreground">Latest sales activity.</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentOrders.length === 0 && (
              <EmptyRow icon={KeyRound} label="No orders yet" hint="Add an order to track revenue." />
            )}
            {recentOrders.map((o: any) => {
              const c = customers.find((x: any) => x.id === o.customer_id);
              const p = products.find((x: any) => x.id === o.product_id);
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c?.email ?? "—"}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {p?.name} · {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="font-display text-sm font-semibold">
                      {formatMoney(o.amount, o.currency)}
                    </div>
                    <Badge
                      variant={o.status === "paid" ? "default" : "secondary"}
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {o.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink to="/products" icon={Package} label="Products" hint="Manage plugins & versions" />
        <QuickLink to="/customers" icon={Users} label="Customers" hint="Add & edit customers" />
        <QuickLink to="/settings" icon={KeyRound} label="Integration" hint="Plugin API docs & keys" />
      </div>
    </div>
  );
}

function EmptyRow({ icon: Icon, label, hint }: { icon: any; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, hint }: { to: any; icon: any; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-card-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="font-display text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
