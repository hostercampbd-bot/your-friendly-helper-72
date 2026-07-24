import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAll, upsertOrder, deleteOrder } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listAll);
  const save = useServerFn(upsertOrder);
  const del = useServerFn(deleteOrder);
  const q = useQuery({ queryKey: ["all"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const saveM = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all"] }); setOpen(false); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const customers = q.data?.customers ?? [];
  const products = q.data?.products ?? [];
  const licenses = q.data?.licenses ?? [];
  const orders = q.data?.orders ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Track payments and reconcile with issued licenses."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!customers.length || !products.length} onClick={() => setEdit(null)}>New order</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} order</DialogTitle></DialogHeader>
              <Form initial={edit} customers={customers} products={products} licenses={licenses} onSubmit={(v: any) => saveM.mutate(v)} busy={saveM.isPending} />
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="overflow-hidden shadow-card-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Ref</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No orders yet.</TableCell></TableRow>
            )}
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{customers.find((c: any) => c.id === o.customer_id)?.email}</TableCell>
                <TableCell>{products.find((p: any) => p.id === o.product_id)?.name}</TableCell>
                <TableCell className="text-right font-display font-semibold">{formatMoney(o.amount, o.currency)}</TableCell>
                <TableCell><Badge variant={o.status === "paid" ? "default" : "secondary"} className="uppercase tracking-wider text-[10px]">{o.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{o.external_ref}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEdit(o); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirm("Delete?") && delM.mutate(o.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Form({ initial, customers, products, licenses, onSubmit, busy }: any) {
  const [f, setF] = useState({
    id: initial?.id,
    customer_id: initial?.customer_id ?? customers[0]?.id ?? "",
    product_id: initial?.product_id ?? products[0]?.id ?? "",
    license_id: initial?.license_id ?? "",
    amount: initial?.amount ?? 0,
    currency: initial?.currency ?? DEFAULT_CURRENCY,
    status: initial?.status ?? "pending",
    external_ref: initial?.external_ref ?? "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, amount: Number(f.amount), license_id: f.license_id || null }); }} className="space-y-3">
      <div>
        <Label>Customer</Label>
        <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Product</Label>
        <Select value={f.product_id} onValueChange={(v) => setF({ ...f, product_id: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>License (optional)</Label>
        <Select value={f.license_id || "none"} onValueChange={(v) => setF({ ...f, license_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— none —</SelectItem>
            {licenses.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.license_key}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Amount</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div><Label>Currency</Label><Input maxLength={3} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })} /></div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="paid">paid</SelectItem>
            <SelectItem value="refunded">refunded</SelectItem>
            <SelectItem value="cancelled">cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>External ref</Label><Input value={f.external_ref} onChange={(e) => setF({ ...f, external_ref: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "..." : "Save"}</Button>
    </form>
  );
}
