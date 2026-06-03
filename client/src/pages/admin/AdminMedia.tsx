import { useState, useRef } from "react";
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

function ProgressCard({
  title,
  description,
  progress,
  onStart,
  onRefresh,
  isStarting,
  buttonLabel,
  icon: Icon,
}: {
  title: string;
  description: string;
  progress: DownloadProgress | undefined;
  onStart: () => void;
  onRefresh: () => void;
  isStarting: boolean;
  buttonLabel: string;
  icon: React.ElementType;
}) {
  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const isRunning = progress?.status === "running";
  const isDone = progress?.status === "done";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && progress.status !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isRunning ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {progress.current}
                  </span>
                ) : isDone ? (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Done — {progress.completed} saved, {progress.failed} failed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    Error occurred
                  </span>
                )}
              </span>
              <span className="font-medium tabular-nums">{pct}%</span>
            </div>
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {progress.completed} of {progress.total} processed
            </p>
            {progress.errors.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{progress.errors.length} error(s)</summary>
                <ul className="mt-1 pl-2 space-y-0.5">
                  {progress.errors.slice(0, 15).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            onClick={onStart}
            disabled={isStarting || isRunning}
            data-testid={`button-start-${buttonLabel.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Downloading…</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> {buttonLabel}</>
            )}
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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

  const { data: imgProgress, refetch: refetchImgProgress } = useQuery<DownloadProgress>({
    queryKey: ["/api/admin/media/download-images/progress"],
    refetchInterval: (q) => q.state.data?.status === "running" ? 2000 : false,
  });

  const { data: fileProgress, refetch: refetchFileProgress } = useQuery<DownloadProgress>({
    queryKey: ["/api/admin/media/download-files/progress"],
    refetchInterval: (q) => q.state.data?.status === "running" ? 3000 : false,
  });

  const startImageDownloadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/media/download-images", {}),
    onSuccess: () => {
      toast({ title: "Image download started", description: "Running in the background — this takes a few minutes." });
      setTimeout(() => refetchImgProgress(), 1000);
    },
    onError: () => toast({ title: "Failed to start image download", variant: "destructive" }),
  });

  const startFileDownloadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/media/download-files", {}),
    onSuccess: () => {
      toast({ title: "File download started", description: "Downloading all test bank ZIP files — this may take a while." });
      setTimeout(() => refetchFileProgress(), 1000);
    },
    onError: () => toast({ title: "Failed to start file download", variant: "destructive" }),
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/admin/products/${productId}/upload-image`, {
        method: "POST", body: formData, credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImageProductId(null);
      toast({ title: "Image uploaded successfully" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const uploadDownloadMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/products/${productId}/upload-download`, {
        method: "POST", body: formData, credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDownloadProductId(null);
      toast({ title: "Download file uploaded successfully" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
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

  const isLocal = (url: string | null | undefined) => url?.startsWith("/uploads/");

  const localImages = products?.filter(p => isLocal(p.imageUrl)).length ?? 0;
  const localDownloads = products?.filter(p => isLocal(p.downloadPath)).length ?? 0;
  const totalWithDownloads = products?.filter(p => p.downloadPath).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Media & File Hosting</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Self-host all product images and download files — no dependency on external websites.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Products", value: products?.length ?? "—", icon: HardDrive, color: "" },
            { label: "Local Images", value: localImages, icon: Image, color: "text-green-600" },
            { label: "Local Downloads", value: `${localDownloads} / ${totalWithDownloads}`, icon: FileArchive, color: "text-green-600" },
            { label: "External Images", value: (products?.length ?? 0) - localImages, icon: AlertCircle, color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bulk Image Download */}
        <ProgressCard
          title="Download All Product Images"
          description="Automatically saves all product images from studiazone.com to your server. Runs in the background — takes a few minutes for 300 products."
          progress={imgProgress}
          onStart={() => startImageDownloadMutation.mutate()}
          onRefresh={() => refetchImgProgress()}
          isStarting={startImageDownloadMutation.isPending}
          buttonLabel="Download All Images"
          icon={Image}
        />

        {/* Bulk File Download */}
        <ProgressCard
          title="Download All Test Bank Files"
          description="Automatically downloads all product ZIP/PDF files from studiazone.com to your server. Files can be large — this may take 10–30 minutes depending on your connection."
          progress={fileProgress}
          onStart={() => startFileDownloadMutation.mutate()}
          onRefresh={() => refetchFileProgress()}
          isStarting={startFileDownloadMutation.isPending}
          buttonLabel="Download All Files"
          icon={FileArchive}
        />

        {/* Per-product upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Per-Product Manual Upload
            </CardTitle>
            <CardDescription>
              Manually upload an image or download file for a specific product.
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
                    <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant={isLocal(product.imageUrl) ? "default" : "outline"} className="text-xs">
                          <Image className="h-2.5 w-2.5 mr-1" />
                          {isLocal(product.imageUrl) ? "Local image" : "External image"}
                        </Badge>
                        <Badge
                          variant={isLocal(product.downloadPath) ? "default" : product.downloadPath ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          <FileArchive className="h-2.5 w-2.5 mr-1" />
                          {isLocal(product.downloadPath) ? "Local file" : product.downloadPath ? "External file" : "No file"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Upload image"
                        disabled={uploadImageMutation.isPending && imageProductId === product.id}
                        onClick={() => { setImageProductId(product.id); setTimeout(() => imageInputRef.current?.click(), 0); }}
                        data-testid={`button-upload-image-${product.id}`}
                      >
                        {uploadImageMutation.isPending && imageProductId === product.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Image className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Upload download file"
                        disabled={uploadDownloadMutation.isPending && downloadProductId === product.id}
                        onClick={() => { setDownloadProductId(product.id); setTimeout(() => downloadInputRef.current?.click(), 0); }}
                        data-testid={`button-upload-download-${product.id}`}
                      >
                        {uploadDownloadMutation.isPending && downloadProductId === product.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <FileArchive className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
            <input ref={downloadInputRef} type="file" accept=".zip,.pdf,.rar,.7z" className="hidden" onChange={handleDownloadFileChange} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
