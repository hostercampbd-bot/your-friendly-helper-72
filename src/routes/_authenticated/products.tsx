import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAll, upsertProduct, deleteProduct } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAll);
  const save = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEdit(null)}>New product</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} product</DialogTitle></DialogHeader>
            <ProductForm initial={edit} onSubmit={(v: any) => saveM.mutate(v)} busy={saveM.isPending} />
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Version</TableHead><TableHead>Download</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(q.data?.products ?? []).map((p: any) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell><code>{p.slug}</code></TableCell>
              <TableCell>{p.latest_version}</TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{p.download_url}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => { setEdit(p); setOpen(true); }}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => confirm("Delete?") && delM.mutate(p.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProductForm({ initial, onSubmit, busy }: any) {
  const [f, setF] = useState({
    id: initial?.id,
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    latest_version: initial?.latest_version ?? "1.0.0",
    download_url: initial?.download_url ?? "",
    changelog: initial?.changelog ?? "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Slug</Label><Input required value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
      <div><Label>Latest version</Label><Input required value={f.latest_version} onChange={(e) => setF({ ...f, latest_version: e.target.value })} /></div>
      <div><Label>Download URL</Label><Input type="url" value={f.download_url} onChange={(e) => setF({ ...f, download_url: e.target.value })} /></div>
      <div><Label>Changelog</Label><Textarea value={f.changelog} onChange={(e) => setF({ ...f, changelog: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "..." : "Save"}</Button>
    </form>
  );
}
