import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Upload, Image, FileArchive, CheckCircle2, AlertCircle, Loader2, RefreshCw, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Product } from "@shared/schema";

interface DownloadProgress {
  status: "idle" | "running" | "done" | "error";
  total: number;
  completed: number;
  failed: number;
  current: string;
  errors: string[];
}

export default function AdminMedia() {
  const [search, setSearch] = useState("");
  const [imageProductId, setImageProductId] = useState<string | null>(null);
  const [downloadProductId, setDownloadProductId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/products${params}`);
      return res.json();
    },
  });

  const { data: progress, refetch: refetchProgress } = useQuery<DownloadProgress>({
    queryKey: ["/api/admin/media/download-images/progress"],
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "running" ? 2000 : false;
    },
  });

  const startDownloadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/media/download-images", {}),
    onSuccess: () => {
      toast({ title: "Image download started", description: "All product images will be saved locally in the background." });
      setTimeout(() => refetchProgress(), 1000);
    },
    onError: () => {
      toast({ title: "Failed to start download", variant: "destructive" });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/admin/products/${productId}/upload-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImageProductId(null);
      toast({ title: "Image uploaded and saved locally" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const uploadDownloadMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/products/${productId}/upload-download`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDownloadProductId(null);
      toast({ title: "Download file uploaded and saved locally" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageProductId) return;
    uploadImageMutation.mutate({ productId: imageProductId, file });
    e.target.value = "";
  };

  const handleDownloadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !downloadProductId) return;
    uploadDownloadMutation.mutate({ productId: downloadProductId, file });
    e.target.value = "";
  };

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const isLocalUrl = (url: string | null | undefined) =>
    url?.startsWith("/uploads/");

  const localImages = products?.filter(p => isLocalUrl(p.imageUrl)).length ?? 0;
  const localDownloads = products?.filter(p => isLocalUrl(p.downloadPath)).length ?? 0;
  const totalWithDownloads = products?.filter(p => p.downloadPath).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Media & File Hosting</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Self-host product images and download files so you're not dependent on external sites.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Products</span>
              </div>
              <p className="text-2xl font-bold mt-1">{products?.length ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Local Images</span>
              </div>
              <p className="text-2xl font-bold mt-1">{localImages}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileArchive className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Local Downloads</span>
              </div>
              <p className="text-2xl font-bold mt-1">{localDownloads} / {totalWithDownloads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">External Images</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {(products?.length ?? 0) - localImages}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Image Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Bulk Image Download
            </CardTitle>
            <CardDescription>
              Automatically download all product images from external URLs (studiazone.com) and save them locally.
              This runs in the background and may take several minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress && progress.status !== "idle" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.status === "running" ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Downloading: {progress.current}
                      </span>
                    ) : progress.status === "done" ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed — {progress.completed} downloaded, {progress.failed} failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        Error occurred
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} />
                <p className="text-xs text-muted-foreground">
                  {progress.completed} of {progress.total} products processed
                </p>
                {progress.errors.length > 0 && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">{progress.errors.length} error(s)</summary>
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {progress.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => startDownloadMutation.mutate()}
                disabled={startDownloadMutation.isPending || progress?.status === "running"}
                data-testid="button-start-bulk-download"
              >
                {progress?.status === "running" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Downloading…</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" /> Download All Images</>
                )}
              </Button>
              <Button variant="outline" onClick={() => refetchProgress()} data-testid="button-refresh-progress">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Per-product upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Per-Product File Upload
            </CardTitle>
            <CardDescription>
              Upload an image or download file for a specific product. Upload the ZIP/PDF test bank files here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4"
              data-testid="input-media-search"
            />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {products?.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    data-testid={`row-product-${product.id}`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-full h-full p-2 text-muted-foreground" />
                      )}
                    </div>

                    {/* Title + badges */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        <Badge
                          variant={isLocalUrl(product.imageUrl) ? "default" : "outline"}
                          className="text-xs"
                        >
                          <Image className="h-2.5 w-2.5 mr-1" />
                          {isLocalUrl(product.imageUrl) ? "Local image" : "External image"}
                        </Badge>
                        {product.downloadPath && (
                          <Badge
                            variant={isLocalUrl(product.downloadPath) ? "default" : "outline"}
                            className="text-xs"
                          >
                            <FileArchive className="h-2.5 w-2.5 mr-1" />
                            {isLocalUrl(product.downloadPath) ? "Local file" : "External file"}
                          </Badge>
                        )}
                        {!product.downloadPath && (
                          <Badge variant="secondary" className="text-xs">No download file</Badge>
                        )}
                      </div>
                    </div>

                    {/* Upload buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Upload product image"
                        disabled={uploadImageMutation.isPending && imageProductId === product.id}
                        onClick={() => {
                          setImageProductId(product.id);
                          setTimeout(() => imageInputRef.current?.click(), 0);
                        }}
                        data-testid={`button-upload-image-${product.id}`}
                      >
                        {uploadImageMutation.isPending && imageProductId === product.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Image className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Upload download file (ZIP/PDF)"
                        disabled={uploadDownloadMutation.isPending && downloadProductId === product.id}
                        onClick={() => {
                          setDownloadProductId(product.id);
                          setTimeout(() => downloadInputRef.current?.click(), 0);
                        }}
                        data-testid={`button-upload-download-${product.id}`}
                      >
                        {uploadDownloadMutation.isPending && downloadProductId === product.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileArchive className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
              data-testid="input-file-image"
            />
            <input
              ref={downloadInputRef}
              type="file"
              accept=".zip,.pdf,.rar,.7z"
              className="hidden"
              onChange={handleDownloadFileChange}
              data-testid="input-file-download"
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
