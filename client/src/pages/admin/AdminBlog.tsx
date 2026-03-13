import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Edit2, Trash2, Plus, Eye, EyeOff, Loader2, BookOpen } from "lucide-react";
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

interface BlogPost {
  id: string;
  productId: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlog() {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    published: false,
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const { toast } = useToast();

  const { data: posts = [], isLoading, refetch } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/blog${params}`);
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      return res.json();
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/blog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setEditingPost(null);
      setShowEditDialog(false);
      toast({ title: "Blog post updated successfully" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update blog post", 
        description: error?.message || "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/blog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setShowCreateDialog(false);
      setEditForm({ title: "", excerpt: "", content: "", imageUrl: "", published: false });
      toast({ title: "Blog post created successfully" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create blog post", 
        description: error?.message || "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({ title: "Blog post deleted successfully" });
      refetch();
    },
    onError: () => {
      toast({ title: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/blog/generate-all"),
    onSuccess: (data: any) => {
      toast({ 
        title: "Blog posts generated", 
        description: `Created ${data.created} new posts. ${data.errors > 0 ? `${data.errors} errors occurred.` : ""}` 
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Generation failed", 
        description: error?.message || "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const handleEditClick = (post: BlogPost) => {
    setEditingPost(post);
    setEditForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      imageUrl: post.imageUrl || "",
      published: post.published,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingPost) return;
    updatePostMutation.mutate({
      id: editingPost.id,
      data: editForm,
    });
  };

  const handleCreatePost = () => {
    if (!editForm.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    createPostMutation.mutate(editForm);
  };

  const handleTogglePublish = (post: BlogPost) => {
    updatePostMutation.mutate({
      id: post.id,
      data: { published: !post.published },
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === posts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(posts.map(p => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  };

  const handleDeleteMultiple = () => {
    selectedIds.forEach(id => {
      deletePostMutation.mutate(id);
    });
    setSelectedIds([]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Blog Posts</h1>
            <p className="text-muted-foreground mt-1">Manage and create study guides</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={generateAllMutation.isPending}
              variant="outline"
              data-testid="button-generate-all-blogs"
            >
              {generateAllMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Auto-Generate All
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-blog"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search blog posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-blog-search"
                />
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteMultiple}
                    disabled={deletePostMutation.isPending}
                    data-testid="button-delete-selected-blogs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No blog posts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === posts.length && posts.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all-blogs"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id} data-testid={`row-blog-${post.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(post.id)}
                            onCheckedChange={() => handleToggleSelect(post.id)}
                            data-testid={`checkbox-blog-${post.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{post.slug}</TableCell>
                        <TableCell>
                          <Badge
                            variant={post.published ? "default" : "secondary"}
                            onClick={() => handleTogglePublish(post)}
                            className="cursor-pointer"
                            data-testid={`badge-status-${post.id}`}
                          >
                            {post.published ? (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 mr-1" />
                                Draft
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(post)}
                              data-testid={`button-edit-blog-${post.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePostMutation.mutate(post.id)}
                              disabled={deletePostMutation.isPending}
                              data-testid={`button-delete-blog-${post.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                data-testid="input-edit-blog-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Excerpt</label>
              <Textarea
                value={editForm.excerpt}
                onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                rows={2}
                data-testid="input-edit-blog-excerpt"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content (HTML)</label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={8}
                className="font-mono text-xs"
                data-testid="input-edit-blog-content"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-edit-blog-imageUrl"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="published"
                checked={editForm.published}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, published: !!checked })
                }
                data-testid="checkbox-edit-blog-published"
              />
              <label htmlFor="published" className="text-sm font-medium cursor-pointer">
                Published
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit-blog"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updatePostMutation.isPending}
              data-testid="button-save-edit-blog"
            >
              {updatePostMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Blog Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Blog post title"
                data-testid="input-create-blog-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Excerpt</label>
              <Textarea
                value={editForm.excerpt}
                onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                placeholder="Short summary (optional)"
                rows={2}
                data-testid="input-create-blog-excerpt"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content (HTML)</label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="Blog post content"
                rows={8}
                className="font-mono text-xs"
                data-testid="input-create-blog-content"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-create-blog-imageUrl"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="published-create"
                checked={editForm.published}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, published: !!checked })
                }
                data-testid="checkbox-create-blog-published"
              />
              <label htmlFor="published-create" className="text-sm font-medium cursor-pointer">
                Publish immediately
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditForm({ title: "", excerpt: "", content: "", imageUrl: "", published: false });
              }}
              data-testid="button-cancel-create-blog"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={createPostMutation.isPending}
              data-testid="button-save-create-blog"
            >
              {createPostMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
