import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAll, createLicense, updateLicense, deleteLicense, removeActivation } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Play, Pause, Ban, Copy, Settings2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/licenses")({
  head: () => ({ meta: [{ title: "Licenses" }] }),
  component: Page,
});

const statusColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  suspended: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  expired: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  revoked: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listAll);
  const create = useServerFn(createLicense);
  const update = useServerFn(updateLicense);
  const del = useServerFn(deleteLicense);
  const rmAct = useServerFn(removeActivation);

  const q = useQuery({ queryKey: ["all"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);

  const createM = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all"] }); setOpen(false); toast.success("License created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateM = useMutation({
    mutationFn: (v: any) => update({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all"] }),
    onError: (e: any) => toast.error(e.message),
  });
  const rmActM = useMutation({
    mutationFn: (id: string) => rmAct({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const customers = q.data?.customers ?? [];
  const products = q.data?.products ?? [];
  const licenses = q.data?.licenses ?? [];
  const activations = q.data?.activations ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Licenses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!customers.length || !products.length}>New license</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New license</DialogTitle></DialogHeader>
            <CreateForm customers={customers} products={products} onSubmit={(v: any) => createM.mutate(v)} busy={createM.isPending} />
          </DialogContent>
        </Dialog>
      </div>
      {(!customers.length || !products.length) && (
        <p className="text-sm text-muted-foreground">Create at least one product and customer first.</p>
      )}
      <Table>
        <TableHeader><TableRow>
          <TableHead>Key</TableHead><TableHead>Product</TableHead><TableHead>Customer</TableHead>
          <TableHead>Status</TableHead><TableHead>Activations</TableHead><TableHead>Expires</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {licenses.map((l: any) => {
            const used = activations.filter((a: any) => a.license_id === l.id).length;
            const p = products.find((p: any) => p.id === l.product_id);
            const c = customers.find((c: any) => c.id === l.customer_id);
            return (
              <TableRow key={l.id}>
                <TableCell><code className="text-xs">{l.license_key}</code></TableCell>
                <TableCell>{p?.name}</TableCell>
                <TableCell>{c?.email}</TableCell>
                <TableCell><Badge className={statusColors[l.status]}>{l.status}</Badge></TableCell>
                <TableCell>{used} / {l.max_activations}</TableCell>
                <TableCell className="text-xs">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(l.license_key); toast.success("Key copied"); }}>
                        <Copy className="mr-2 h-4 w-4" /> Copy key
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDetail(l)}>
                        <Settings2 className="mr-2 h-4 w-4" /> Manage
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {l.status !== "active" && (
                        <DropdownMenuItem onClick={() => updateM.mutate({ id: l.id, status: "active" })}>
                          <Play className="mr-2 h-4 w-4" /> Activate
                        </DropdownMenuItem>
                      )}
                      {l.status !== "suspended" && (
                        <DropdownMenuItem onClick={() => updateM.mutate({ id: l.id, status: "suspended" })}>
                          <Pause className="mr-2 h-4 w-4" /> Suspend
                        </DropdownMenuItem>
                      )}
                      {l.status !== "revoked" && (
                        <DropdownMenuItem onClick={() => updateM.mutate({ id: l.id, status: "revoked" })}>
                          <Ban className="mr-2 h-4 w-4" /> Revoke
                        </DropdownMenuItem>
                      )}
                      {used > 0 && (
                        <DropdownMenuItem onClick={() => {
                          activations.filter((a: any) => a.license_id === l.id).forEach((a: any) => rmActM.mutate(a.id));
                          toast.success("Activations reset");
                        }}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Reset activations
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDel(l)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Manage license</DialogTitle></DialogHeader>
          {detail && (
            <ManageLicense
              license={detail}
              activations={activations.filter((a: any) => a.license_id === detail.id)}
              onUpdate={(v: any) => updateM.mutate({ id: detail.id, ...v })}
              onRemoveActivation={(id: string) => rmActM.mutate(id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this license?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the license and all its activations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDel) delM.mutate(confirmDel.id); setConfirmDel(null); }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateForm({ customers, products, onSubmit, busy }: any) {
  const [f, setF] = useState({
    product_id: products[0]?.id ?? "",
    customer_id: customers[0]?.id ?? "",
    max_activations: 1,
    expires_at: "",
    notes: "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, expires_at: f.expires_at || null }); }} className="space-y-3">
      <div>
        <Label>Product</Label>
        <Select value={f.product_id} onValueChange={(v) => setF({ ...f, product_id: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Customer</Label>
        <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Max activations</Label><Input type="number" min={1} value={f.max_activations} onChange={(e) => setF({ ...f, max_activations: parseInt(e.target.value) || 1 })} /></div>
      <div><Label>Expires (optional)</Label><Input type="datetime-local" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
      <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "..." : "Generate license"}</Button>
    </form>
  );
}

function ManageLicense({ license, activations, onUpdate, onRemoveActivation }: any) {
  const [status, setStatus] = useState(license.status);
  const [max, setMax] = useState(license.max_activations);
  const [exp, setExp] = useState(license.expires_at ? license.expires_at.slice(0, 16) : "");
  return (
    <div className="space-y-4">
      <div>
        <Label>License key</Label>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 rounded bg-muted p-2 text-sm">{license.license_key}</code>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(license.license_key); toast.success("Copied"); }}>Copy</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="suspended">suspended</SelectItem>
              <SelectItem value="expired">expired</SelectItem>
              <SelectItem value="revoked">revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Max activations</Label><Input type="number" min={1} value={max} onChange={(e) => setMax(parseInt(e.target.value) || 1)} /></div>
        <div><Label>Expires</Label><Input type="datetime-local" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
      </div>
      <Button onClick={() => onUpdate({ status, max_activations: max, expires_at: exp || null })}>Save changes</Button>

      <div>
        <h3 className="mb-2 text-sm font-medium">Active domains ({activations.length})</h3>
        {activations.length === 0 && <p className="text-sm text-muted-foreground">No domains activated.</p>}
        <div className="space-y-1">
          {activations.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                <div className="font-mono">{a.domain}</div>
                <div className="text-xs text-muted-foreground">
                  Activated {new Date(a.activated_at).toLocaleDateString()} · Last check {new Date(a.last_check_at).toLocaleDateString()}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onRemoveActivation(a.id)}>Reset</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
