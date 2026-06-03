import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Upload, Save, RefreshCw, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Product } from "@shared/schema";

export default function AdminDownloads() {
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [downloadPath, setDownloadPath] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: missingProducts, isLoading: missingLoading, refetch: refetchMissing } = useQuery<Product[]>({
    queryKey: ["/api/admin/products/missing-downloads"],
  });

  const updatePathMutation = useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) =>
      apiRequest("PATCH", `/api/admin/products/${id}/download-path`, { downloadPath: path }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products/missing-downloads"] });
      setEditingProduct(null);
      toast({ title: "Download path updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: { id: string; downloadPath: string }[]) =>
      apiRequest("POST", "/api/admin/products/bulk-download-paths", { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products/missing-downloads"] });
      setShowBulkDialog(false);
      setBulkText("");
      toast({ title: "Bulk update completed" });
    },
    onError: () => {
      toast({ title: "Bulk update failed", variant: "destructive" });
    },
  });

  const syncWooMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/sync-woocommerce-downloads"),
    onSuccess: async (response: any) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products/missing-downloads"] });
      toast({ 
        title: "WooCommerce sync completed", 
        description: `Synced: ${data.synced}, Failed: ${data.failed}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Sync failed", 
        description: error.message || "WooCommerce API not configured",
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDownloadPath(product.downloadPath || "");
  };

  const handleSave = () => {
    if (!editingProduct) return;
    updatePathMutation.mutate({ id: editingProduct.id, path: downloadPath });
  };

  const handleBulkUpload = () => {
    const lines = bulkText.trim().split("\n");
    const updates: { id: string; downloadPath: string }[] = [];

    for (const line of lines) {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        updates.push({ id: parts[0], downloadPath: parts[1] });
      }
    }

    if (updates.length === 0) {
      toast({ title: "No valid entries found", variant: "destructive" });
      return;
    }

    bulkUpdateMutation.mutate(updates);
  };

  const filteredProducts = products?.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.id.includes(search)
  ) || [];

  const productsWithDownloads = filteredProducts.filter(p => p.downloadPath);
  const productsWithoutDownloads = filteredProducts.filter(p => !p.downloadPath);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-downloads-title">Download Management</h1>
            <p className="text-muted-foreground">Map download files to products for the Thank You page.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkDialog(true)} data-testid="button-bulk-upload">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button 
              onClick={() => syncWooMutation.mutate()} 
              disabled={syncWooMutation.isPending}
              data-testid="button-sync-woo"
            >
              {syncWooMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync WooCommerce
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{products?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Download Links</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{productsWithDownloads.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Missing Download Links</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{missingProducts?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>Products Missing Downloads</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-downloads"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {missingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : missingProducts && missingProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingProducts.slice(0, 50).map((product) => (
                      <TableRow key={product.id} data-testid={`row-missing-${product.id}`}>
                        <TableCell className="font-mono text-sm">{product.id}</TableCell>
                        <TableCell className="max-w-xs truncate">{product.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Missing
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Add Link
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {missingProducts.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Showing 50 of {missingProducts.length} products.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>All products have download links configured!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Download Path</DialogTitle>
              <DialogDescription>
                {editingProduct?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Product ID</label>
                <Input value={editingProduct?.id || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Download URL or File Path</label>
                <Input
                  placeholder="https://example.com/files/product.pdf"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  data-testid="input-download-path"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the full URL to the downloadable file
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={updatePathMutation.isPending}>
                {updatePathMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Upload Download Links</DialogTitle>
              <DialogDescription>
                Paste your product ID and download URL mappings, one per line.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Format: ProductID, DownloadURL</label>
                <Textarea
                  placeholder={`12345, https://example.com/file1.pdf
67890, https://example.com/file2.pdf
11111, https://example.com/file3.pdf`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="textarea-bulk-upload"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Each line should contain the product ID followed by a comma and the download URL.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
              <Button onClick={handleBulkUpload} disabled={bulkUpdateMutation.isPending}>
                {bulkUpdateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload {bulkText.split("\n").filter(l => l.trim()).length} Links
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
