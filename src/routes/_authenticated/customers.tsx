import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAll, upsertCustomer, deleteCustomer } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listAll);
  const save = useServerFn(upsertCustomer);
  const del = useServerFn(deleteCustomer);
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

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Customers"
        description="People who own or use your plugin licenses."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={() => setEdit(null)}>New customer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} customer</DialogTitle></DialogHeader>
              <Form initial={edit} onSubmit={(v: any) => saveM.mutate(v)} busy={saveM.isPending} />
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="overflow-hidden shadow-card-soft">
        <Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {(q.data?.customers ?? []).length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No customers yet.</TableCell></TableRow>
            )}
            {(q.data?.customers ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.email}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell className="max-w-sm truncate text-xs text-muted-foreground">{c.notes}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEdit(c); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirm("Delete?") && delM.mutate(c.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Form({ initial, onSubmit, busy }: any) {
  const [f, setF] = useState({
    id: initial?.id,
    email: initial?.email ?? "",
    name: initial?.name ?? "",
    notes: initial?.notes ?? "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div><Label>Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "..." : "Save"}</Button>
    </form>
  );
}
