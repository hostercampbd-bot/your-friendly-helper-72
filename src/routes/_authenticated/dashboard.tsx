import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAll, checkIsAdmin } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — License Panel" }] }),
  component: Dashboard,
});

function Dashboard() {
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listAll);

  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });

  if (admin.isLoading) return <div>Loading...</div>;
  if (admin.isError) {
    return (
      <div role="alert" className="space-y-2">
        <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
        <p className="text-sm text-destructive">
          {admin.error instanceof Error ? admin.error.message : "Unable to verify administrator access."}
        </p>
      </div>
    );
  }
  if (!admin.data?.isAdmin) {
    return (
      <Card className="max-w-md">
        <CardHeader><CardTitle>Not an admin yet</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You're signed in but don't have admin access. Contact the account administrator.
          </p>
        </CardContent>
      </Card>
    );
  }
  return <DashboardInner list={list} />;
}

function DashboardInner({ list }: { list: () => Promise<any> }) {
  const q = useQuery({ queryKey: ["all"], queryFn: () => list() });
  const d = q.data;
  const now = Date.now();
  const expiringSoon = (d?.licenses ?? []).filter((l: any) =>
    l.expires_at && new Date(l.expires_at).getTime() - now < 1000 * 60 * 60 * 24 * 30 && l.status === "active"
  ).length;
  const active = (d?.licenses ?? []).filter((l: any) => l.status === "active").length;
  const revenue = (d?.orders ?? []).filter((o: any) => o.status === "paid").reduce((s: number, o: any) => s + Number(o.amount), 0);

  const stats = [
    { label: "Active licenses", value: active },
    { label: "Total licenses", value: d?.licenses.length ?? 0 },
    { label: "Expiring in 30d", value: expiringSoon },
    { label: "Customers", value: d?.customers.length ?? 0 },
    { label: "Products", value: d?.products.length ?? 0 },
    { label: "Paid revenue", value: `$${revenue.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{s.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
