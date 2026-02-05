import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Edit2, Save, X, Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Product, Tag as TagType } from "@shared/schema";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    salePrice: "",
    category: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [newTag, setNewTag] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/products${params}`);
      return res.json();
    },
  });

  const { data: tags } = useQuery<TagType[]>({
    queryKey: ["/api/admin/tags"],
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      toast({ title: "Product updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { ids: string[]; updates: any }) =>
      apiRequest("POST", "/api/admin/products/bulk-update", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedIds([]);
      setShowBulkDialog(false);
      setBulkPrice("");
      setBulkCategory("");
      toast({ title: "Products updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update products", variant: "destructive" });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/admin/tags", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      setNewTag("");
      toast({ title: "Tag created" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      toast({ title: "Tag deleted" });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description || "",
      price: product.price,
      salePrice: product.salePrice || "",
      category: product.category || "",
      seoTitle: product.seoTitle || "",
      seoDescription: product.seoDescription || "",
    });
  };

  const handleSave = () => {
    if (!editingProduct) return;
    updateProductMutation.mutate({
      id: editingProduct.id,
      data: {
        ...editForm,
        salePrice: editForm.salePrice || null,
      },
    });
  };

  const handleBulkUpdate = () => {
    const updates: any = {};
    if (bulkPrice) updates.price = bulkPrice;
    if (bulkCategory) updates.category = bulkCategory;
    if (Object.keys(updates).length === 0) return;
    bulkUpdateMutation.mutate({ ids: selectedIds, updates });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!products) return;
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-products-title">Product Management</h1>
            <p className="text-muted-foreground">Edit products, manage tags, and update pricing.</p>
          </div>
          {selectedIds.length > 0 && (
            <Button onClick={() => setShowBulkDialog(true)} data-testid="button-bulk-edit">
              <Edit2 className="w-4 h-4 mr-2" />
              Bulk Edit ({selectedIds.length})
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>Products ({products?.length || 0})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-products"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={products?.length === selectedIds.length && products.length > 0}
                              onCheckedChange={toggleSelectAll}
                              data-testid="checkbox-select-all"
                            />
                          </TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.slice(0, 50).map((product) => (
                          <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(product.id)}
                                onCheckedChange={() => toggleSelect(product.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                  <img
                                    src={product.imageUrl}
                                    alt=""
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <span className="line-clamp-1 max-w-xs">{product.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{product.category || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">${product.price}</span>
                                {product.salePrice && (
                                  <span className="text-sm text-muted-foreground ml-2 line-through">
                                    ${product.salePrice}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(product)}
                                data-testid={`button-edit-${product.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {products && products.length > 50 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 50 of {products.length} products. Use search to find specific items.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="New tag name..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createTagMutation.mutate(newTag)}
                    data-testid="input-new-tag"
                  />
                  <Button
                    size="icon"
                    onClick={() => createTagMutation.mutate(newTag)}
                    disabled={!newTag}
                    data-testid="button-add-tag"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags?.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1">
                      {tag.name}
                      <button
                        onClick={() => deleteTagMutation.mutate(tag.id)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-delete-tag-${tag.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {(!tags || tags.length === 0) && (
                    <p className="text-sm text-muted-foreground">No tags yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  data-testid="input-edit-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  data-testid="input-edit-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <Input
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    data-testid="input-edit-price"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Sale Price</label>
                  <Input
                    value={editForm.salePrice}
                    onChange={(e) => setEditForm({ ...editForm, salePrice: e.target.value })}
                    data-testid="input-edit-sale-price"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  data-testid="input-edit-category"
                />
              </div>
              <div>
                <label className="text-sm font-medium">SEO Title</label>
                <Input
                  value={editForm.seoTitle}
                  onChange={(e) => setEditForm({ ...editForm, seoTitle: e.target.value })}
                  data-testid="input-edit-seo-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">SEO Description</label>
                <Textarea
                  value={editForm.seoDescription}
                  onChange={(e) => setEditForm({ ...editForm, seoDescription: e.target.value })}
                  rows={2}
                  data-testid="input-edit-seo-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateProductMutation.isPending}
                data-testid="button-save-product"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit {selectedIds.length} Products</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">New Price (leave empty to skip)</label>
                <Input
                  placeholder="e.g., 19.99"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  data-testid="input-bulk-price"
                />
              </div>
              <div>
                <label className="text-sm font-medium">New Category (leave empty to skip)</label>
                <Input
                  placeholder="e.g., Nursing"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  data-testid="input-bulk-category"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpdate}
                disabled={bulkUpdateMutation.isPending || (!bulkPrice && !bulkCategory)}
                data-testid="button-apply-bulk"
              >
                Apply to {selectedIds.length} Products
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
