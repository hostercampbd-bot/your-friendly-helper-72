import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAll, checkIsAdmin } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KeyRound,
  Users,
  Package,
  Clock,
  DollarSign,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
          {admin.error instanceof Error
            ? admin.error.message
            : "Unable to verify administrator access."}
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
          You're signed in but don't have admin access. Contact the account
          administrator to be granted a role.
        </CardContent>
      </Card>
    );
  }
  return <DashboardInner list={list} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

function DashboardInner({ list }: { list: () => Promise<any> }) {
  const q = useQuery({ queryKey: ["all"], queryFn: () => list() });
  if (q.isLoading) return <DashboardSkeleton />;
  const d = q.data;
  const now = Date.now();
  const licenses = d?.licenses ?? [];
  const expiringSoon = licenses.filter(
    (l: any) =>
      l.expires_at &&
      new Date(l.expires_at).getTime() - now < 1000 * 60 * 60 * 24 * 30 &&
      l.status === "active",
  ).length;
  const active = licenses.filter((l: any) => l.status === "active").length;
  const revenue = (d?.orders ?? [])
    .filter((o: any) => o.status === "paid")
    .reduce((s: number, o: any) => s + Number(o.amount), 0);

  const stats = [
    { label: "Active licenses", value: active, icon: Activity, accent: "text-emerald-400" },
    { label: "Total licenses", value: licenses.length, icon: KeyRound, accent: "text-primary" },
    { label: "Expiring in 30d", value: expiringSoon, icon: Clock, accent: "text-amber-400" },
    { label: "Customers", value: d?.customers.length ?? 0, icon: Users, accent: "text-sky-400" },
    { label: "Products", value: d?.products.length ?? 0, icon: Package, accent: "text-fuchsia-400" },
    { label: "Paid revenue", value: `$${revenue.toFixed(2)}`, icon: DollarSign, accent: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Overview
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot of licenses, customers, and revenue across your products.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="group relative overflow-hidden border-border/60 bg-card/70 transition-colors hover:border-primary/40"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.accent}`} />
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-semibold tracking-tight">
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
