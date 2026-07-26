import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAll, upsertProduct, deleteProduct, regenerateProductSecret } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { Upload, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";


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
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Your licensable plugins, versions, and release ZIPs."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={() => setEdit(null)}>New product</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} product</DialogTitle></DialogHeader>
              <ProductForm initial={edit} onSubmit={(v: any) => saveM.mutate(v)} busy={saveM.isPending} />
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="overflow-hidden shadow-card-soft">
        <Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Version</TableHead><TableHead>Download</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(q.data?.products ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No products yet.</TableCell></TableRow>
            )}
            {(q.data?.products ?? []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.slug}</code></TableCell>
                <TableCell><code className="text-xs">{p.latest_version}</code></TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{p.download_url}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEdit(p); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirm("Delete?") && delM.mutate(p.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
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
  const [uploading, setUploading] = useState(false);

  const isStored = f.download_url?.startsWith("storage:");
  const storedName = isStored ? f.download_url.split("/").pop() : null;

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please upload a .zip file");
      return;
    }
    setUploading(true);
    try {
      const slug = f.slug || "plugin";
      const version = f.latest_version || "1.0.0";
      const path = `${slug}/${slug}-${version}-${Date.now()}.zip`;
      const { error } = await supabase.storage
        .from("plugin-releases")
        .upload(path, file, { contentType: "application/zip", upsert: false });
      if (error) throw error;
      setF((prev) => ({ ...prev, download_url: `storage:${path}` }));
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Slug</Label><Input required value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
      <div><Label>Latest version</Label><Input required value={f.latest_version} onChange={(e) => setF({ ...f, latest_version: e.target.value })} /></div>

      <div className="space-y-2">
        <Label>Release ZIP</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".zip,application/zip"
            disabled={uploading}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }}
          />
          {uploading && <span className="text-xs text-muted-foreground"><Upload className="inline h-3 w-3 animate-pulse" /> Uploading…</span>}
        </div>
        {isStored && (
          <p className="text-xs text-muted-foreground">
            Stored file: <code>{storedName}</code> (served via signed URL to licensed sites)
          </p>
        )}
      </div>

      <div>
        <Label>Download URL {isStored && <span className="text-xs text-muted-foreground">(auto-set from upload)</span>}</Label>
        <Input
          value={f.download_url}
          onChange={(e) => setF({ ...f, download_url: e.target.value })}
          placeholder="Upload a ZIP above, or paste an external URL"
        />
      </div>

      <div><Label>Changelog</Label><Textarea rows={5} value={f.changelog} onChange={(e) => setF({ ...f, changelog: e.target.value })} /></div>
      <Button type="submit" disabled={busy || uploading}>{busy ? "..." : "Save"}</Button>
    </form>
  );
}
