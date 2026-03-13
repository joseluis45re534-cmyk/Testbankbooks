import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Trash2, Play, Pause, Zap, Clock, CheckCircle2,
  Search, Tag, RefreshCw, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface SeoKeyword {
  id: string;
  keyword: string;
  category: string | null;
  status: string;
  priority: number;
  createdAt: string;
  usedAt: string | null;
  blogPostSlug: string | null;
}

interface BlogScheduleConfig {
  id: string;
  postsPerDay: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  used: { label: "Published", color: "bg-green-100 text-green-800" },
  paused: { label: "Paused", color: "bg-gray-100 text-gray-600" },
};

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleString();
}

function timeUntil(d: string | null) {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminSEO() {
  const { toast } = useToast();
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("auto");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [postsPerDay, setPostsPerDay] = useState<number | null>(null);
  const [runningNow, setRunningNow] = useState(false);

  const { data: keywords = [], isLoading: loadingKeywords } = useQuery<SeoKeyword[]>({
    queryKey: ["/api/admin/seo/keywords"],
  });

  const { data: schedule } = useQuery<BlogScheduleConfig>({
    queryKey: ["/api/admin/seo/schedule"],
  });

  useEffect(() => {
    if (schedule?.postsPerDay && postsPerDay === null) {
      setPostsPerDay(schedule.postsPerDay);
    }
  }, [schedule]);

  const addKeywordsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/seo/keywords", {
        keywords: keywordInput,
        category: selectedCategory === "auto" ? undefined : selectedCategory,
      }),
    onSuccess: (data: any) => {
      toast({ title: `Added ${data.count} keyword(s)`, description: "Keywords queued for blog generation" });
      setKeywordInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/keywords"] });
    },
    onError: () => toast({ title: "Failed to add keywords", variant: "destructive" }),
  });

  const deleteKeywordMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/seo/keywords/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/keywords"] });
    },
    onError: () => toast({ title: "Failed to delete keyword", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/seo/keywords/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/keywords"] }),
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (data: { postsPerDay?: number; enabled?: boolean }) =>
      apiRequest("PATCH", "/api/admin/seo/schedule", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/schedule"] }),
    onError: () => toast({ title: "Failed to update schedule", variant: "destructive" }),
  });

  const runNowMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/seo/schedule/run-now"),
    onSuccess: (data: any) => {
      toast({
        title: `Generated ${data.generated} blog post(s)`,
        description: data.generated === 0 ? "No pending keywords available" : `Articles published to your blog`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/keywords"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/schedule"] });
      setRunningNow(false);
    },
    onError: () => {
      toast({ title: "Generation failed", variant: "destructive" });
      setRunningNow(false);
    },
  });

  const filtered = keywords.filter((k) => {
    if (statusFilter !== "all" && k.status !== statusFilter) return false;
    if (search && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    pending: keywords.filter((k) => k.status === "pending").length,
    used: keywords.filter((k) => k.status === "used").length,
    paused: keywords.filter((k) => k.status === "paused").length,
  };

  const currentPostsPerDay = postsPerDay ?? schedule?.postsPerDay ?? 7;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SEO Blog Automation</h1>
          <p className="text-muted-foreground mt-1">
            Add keywords and the scheduler automatically publishes {schedule?.postsPerDay ?? 7} blog articles per day.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.used}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{keywords.length}</p>
                  <p className="text-xs text-muted-foreground">Total Keywords</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{schedule?.postsPerDay ?? 7}</p>
                  <p className="text-xs text-muted-foreground">Posts/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Add Keywords + Schedule */}
          <div className="space-y-4">
            {/* Add Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Keywords</CardTitle>
                <CardDescription>One keyword per line, or comma-separated. Each keyword becomes a blog article.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder={`NCLEX pharmacology study guide\nnursing fundamentals practice questions\nmedical surgical nursing exam prep\npediatric nursing test bank`}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  rows={6}
                  data-testid="textarea-keywords"
                />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category (optional)</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect from keyword</SelectItem>
                      <SelectItem value="Nursing">Nursing</SelectItem>
                      <SelectItem value="Pharmacology">Pharmacology</SelectItem>
                      <SelectItem value="Anatomy & Physiology">Anatomy & Physiology</SelectItem>
                      <SelectItem value="Medical-Surgical">Medical-Surgical</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Maternal & Newborn">Maternal & Newborn</SelectItem>
                      <SelectItem value="Psychology & Mental Health">Psychology & Mental Health</SelectItem>
                      <SelectItem value="Fundamentals">Fundamentals</SelectItem>
                      <SelectItem value="Test Banks">Test Banks</SelectItem>
                      <SelectItem value="Public Health">Public Health</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => addKeywordsMutation.mutate()}
                  disabled={!keywordInput.trim() || addKeywordsMutation.isPending}
                  data-testid="button-add-keywords"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addKeywordsMutation.isPending ? "Adding..." : "Add to Queue"}
                </Button>
              </CardContent>
            </Card>

            {/* Schedule Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Schedule</CardTitle>
                <CardDescription>Automatically publish articles from your keyword queue every day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-publish enabled</p>
                    <p className="text-xs text-muted-foreground">Runs once per day</p>
                  </div>
                  <Switch
                    checked={schedule?.enabled ?? false}
                    onCheckedChange={(checked) => updateScheduleMutation.mutate({ enabled: checked })}
                    data-testid="switch-schedule-enabled"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Articles per day</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={currentPostsPerDay}
                      onChange={(e) => setPostsPerDay(Number(e.target.value))}
                      className="w-24"
                      data-testid="input-posts-per-day"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScheduleMutation.mutate({ postsPerDay: currentPostsPerDay })}
                      disabled={updateScheduleMutation.isPending}
                      data-testid="button-save-posts-per-day"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Last run: <span className="text-foreground">{formatDate(schedule?.lastRunAt ?? null)}</span></p>
                  <p>
                    Next run: <span className="text-foreground">{formatDate(schedule?.nextRunAt ?? null)}</span>
                    {schedule?.nextRunAt && (
                      <span className="ml-1 text-primary">(in {timeUntil(schedule.nextRunAt)})</span>
                    )}
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => {
                    setRunningNow(true);
                    runNowMutation.mutate();
                  }}
                  disabled={runNowMutation.isPending || runningNow}
                  data-testid="button-run-now"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${runNowMutation.isPending ? "animate-spin" : ""}`} />
                  {runNowMutation.isPending ? "Generating..." : "Run Now"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Keyword List */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search keywords..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-keywords"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({keywords.length})</SelectItem>
                      <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
                      <SelectItem value="used">Published ({counts.used})</SelectItem>
                      <SelectItem value="paused">Paused ({counts.paused})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingKeywords ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">
                      {keywords.length === 0 ? "No keywords yet" : "No keywords match your filter"}
                    </p>
                    <p className="text-sm mt-1">
                      {keywords.length === 0 ? "Add keywords on the left to get started" : "Try a different filter"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.map((kw) => {
                      const statusInfo = STATUS_LABELS[kw.status] || STATUS_LABELS.pending;
                      return (
                        <div
                          key={kw.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                          data-testid={`row-keyword-${kw.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{kw.keyword}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              {kw.category && (
                                <span className="text-xs text-muted-foreground">{kw.category}</span>
                              )}
                              {kw.blogPostSlug && (
                                <a
                                  href={`/blog/${kw.blogPostSlug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  View post →
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {kw.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground"
                                title="Pause this keyword"
                                onClick={() => updateStatusMutation.mutate({ id: kw.id, status: "paused" })}
                                data-testid={`button-pause-${kw.id}`}
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {kw.status === "paused" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground"
                                title="Resume this keyword"
                                onClick={() => updateStatusMutation.mutate({ id: kw.id, status: "pending" })}
                                data-testid={`button-resume-${kw.id}`}
                              >
                                <Play className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive/70 hover:text-destructive"
                              onClick={() => deleteKeywordMutation.mutate(kw.id)}
                              data-testid={`button-delete-${kw.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
