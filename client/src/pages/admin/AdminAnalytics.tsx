import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight, ArrowUpRight, DollarSign, Eye, Info, Monitor, Percent, Receipt, RefreshCw,
  ShoppingCart, Smartphone, Tablet, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsReport } from "../../../../server/analytics";
import AdminLayout from "./AdminLayout";
import { AnalyticsTable, TotalsRow, type Column } from "./AnalyticsTable";

type Metrics = { sessions: number; pageviews: number; carts: number; checkouts: number; orders: number; revenue: number };
type DailyRow = AnalyticsReport["daily"][number];
type SourceRow = AnalyticsReport["sources"][number];
type ReferrerRow = AnalyticsReport["referrers"][number];
type CampaignRow = AnalyticsReport["campaigns"][number];
type LandingRow = AnalyticsReport["landingPages"][number];
type CountryRow = AnalyticsReport["countries"][number];
type DeviceRow = AnalyticsReport["devices"][number];
type PageRow = AnalyticsReport["pages"][number];
type ProductRow = AnalyticsReport["products"][number];
type RecentRow = AnalyticsReport["recent"][number];

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmtInt = (n: number) => n.toLocaleString("en-US");
const fmtMoney = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rate = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtPct = (n: number) => (n ? `${n.toFixed(n < 1 ? 2 : n < 10 ? 1 : 0)}%` : "0%");

function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(day: string, n: number) {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}
const shortDay = (day: string) => parseDay(day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const longDay = (day: string) =>
  parseDay(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

// ─── Date ranges ──────────────────────────────────────────────────────────────

type Range = { from: string; to: string };
const today = () => toDay(new Date());
const PRESETS: { id: string; label: string; range: () => Range }[] = [
  { id: "today", label: "Today", range: () => ({ from: today(), to: today() }) },
  { id: "yesterday", label: "Yesterday", range: () => ({ from: addDays(today(), -1), to: addDays(today(), -1) }) },
  { id: "7d", label: "Last 7 days", range: () => ({ from: addDays(today(), -6), to: today() }) },
  { id: "30d", label: "Last 30 days", range: () => ({ from: addDays(today(), -29), to: today() }) },
  { id: "90d", label: "Last 90 days", range: () => ({ from: addDays(today(), -89), to: today() }) },
  {
    id: "month",
    label: "This month",
    range: () => {
      const now = new Date();
      return { from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDay(now) };
    },
  },
  {
    id: "last-month",
    label: "Last month",
    range: () => {
      const now = new Date();
      return {
        from: toDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
];

// ─── Labels ───────────────────────────────────────────────────────────────────

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryLabel(code: string | null) {
  if (code === "T1") return "Tor network";
  if (!code || !/^[A-Z]{2}$/.test(code) || code === "XX") return "Unknown";
  let name = code;
  try {
    name = regionNames?.of(code) ?? code;
  } catch {
    // unknown code: keep it as is
  }
  const flag = String.fromCodePoint(...code.split("").map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  return `${flag} ${name}`;
}

const DEVICE_ICONS: Record<string, typeof Monitor> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };
const EVENT_LABELS: Record<string, string> = {
  pageview: "Viewed page",
  add_to_cart: "Added to cart",
  begin_checkout: "Started checkout",
  purchase: "Purchased",
};

function SourceLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{source}</span>
      {/Ads$/.test(source) && <Badge variant="secondary">Paid</Badge>}
    </span>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

const intCol = <T,>(key: string, label: string, get: (r: T) => number): Column<T> => ({
  key, label, numeric: true, value: get, render: (r) => fmtInt(get(r)),
});

function metricColumns<T extends Metrics>(opts: { pagesPerVisit?: boolean; funnel?: boolean } = {}): Column<T>[] {
  return [
    intCol<T>("sessions", "Visits", (r) => r.sessions),
    ...(opts.pagesPerVisit
      ? [{
          key: "ppv", label: "Pages / visit", numeric: true,
          value: (r: T) => round2(r.sessions ? r.pageviews / r.sessions : 0),
          render: (r: T) => (r.sessions ? (r.pageviews / r.sessions).toFixed(1) : "0"),
        }]
      : []),
    ...(opts.funnel
      ? [intCol<T>("carts", "Added to cart", (r) => r.carts), intCol<T>("checkouts", "Checkouts", (r) => r.checkouts)]
      : []),
    intCol<T>("orders", "Orders", (r) => r.orders),
    { key: "revenue", label: "Revenue", numeric: true, value: (r) => r.revenue, render: (r) => fmtMoney(r.revenue) },
    {
      key: "conversion", label: "Conversion", numeric: true,
      value: (r) => round2(rate(r.orders, r.sessions)),
      render: (r) => fmtPct(rate(r.orders, r.sessions)),
    },
  ];
}

const DAY_COLUMNS: Column<DailyRow>[] = [
  { key: "day", label: "Date", value: (r) => r.day, render: (r) => <span className="whitespace-nowrap">{longDay(r.day)}</span> },
  intCol<DailyRow>("visitors", "Visitors", (r) => r.visitors),
  intCol<DailyRow>("sessions", "Visits", (r) => r.sessions),
  intCol<DailyRow>("pageviews", "Page views", (r) => r.pageviews),
  intCol<DailyRow>("carts", "Added to cart", (r) => r.carts),
  intCol<DailyRow>("checkouts", "Checkouts", (r) => r.checkouts),
  intCol<DailyRow>("orders", "Orders", (r) => r.orders),
  { key: "revenue", label: "Revenue", numeric: true, value: (r) => r.revenue, render: (r) => fmtMoney(r.revenue) },
  {
    key: "conversion", label: "Conversion", numeric: true,
    value: (r) => round2(rate(r.orders, r.sessions)),
    render: (r) => fmtPct(rate(r.orders, r.sessions)),
  },
];

const SOURCE_COLUMNS: Column<SourceRow>[] = [
  { key: "source", label: "Source", value: (r) => r.source, render: (r) => <SourceLabel source={r.source} /> },
  ...metricColumns<SourceRow>({ pagesPerVisit: true, funnel: true }),
];

const REFERRER_COLUMNS: Column<ReferrerRow>[] = [
  {
    key: "host", label: "Website", value: (r) => r.host,
    render: (r) => (
      <a href={`https://${r.host}`} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
        {r.host}
      </a>
    ),
  },
  ...metricColumns<ReferrerRow>(),
];

const CAMPAIGN_COLUMNS: Column<CampaignRow>[] = [
  { key: "campaign", label: "Campaign", value: (r) => r.utmCampaign || "(no campaign)" },
  { key: "utmSource", label: "utm_source", value: (r) => r.utmSource || "—" },
  { key: "utmMedium", label: "utm_medium", value: (r) => r.utmMedium || "—" },
  ...metricColumns<CampaignRow>({ funnel: true }),
];

const pageLink = (path: string) => (
  <a href={path} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
    {path}
  </a>
);

const LANDING_COLUMNS: Column<LandingRow>[] = [
  { key: "path", label: "Landing page", value: (r) => r.path, render: (r) => pageLink(r.path) },
  ...metricColumns<LandingRow>(),
];

const PAGE_COLUMNS: Column<PageRow>[] = [
  { key: "path", label: "Page", value: (r) => r.path, render: (r) => pageLink(r.path) },
  intCol<PageRow>("pageviews", "Page views", (r) => r.pageviews),
  intCol<PageRow>("sessions", "Visits", (r) => r.sessions),
];

const PRODUCT_COLUMNS: Column<ProductRow>[] = [
  { key: "title", label: "Product", value: (r) => r.title, render: (r) => <span className="line-clamp-2 max-w-md">{r.title}</span> },
  intCol<ProductRow>("views", "Views", (r) => r.views),
  intCol<ProductRow>("adds", "Added to cart", (r) => r.adds),
  intCol<ProductRow>("sold", "Sold", (r) => r.sold),
  {
    key: "viewToCart", label: "View → cart", numeric: true,
    value: (r) => round2(rate(r.adds, r.views)), render: (r) => (r.views ? fmtPct(rate(r.adds, r.views)) : "—"),
  },
  {
    key: "viewToSale", label: "View → sale", numeric: true,
    value: (r) => round2(rate(r.sold, r.views)), render: (r) => (r.views ? fmtPct(rate(r.sold, r.views)) : "—"),
  },
];

const COUNTRY_COLUMNS: Column<CountryRow>[] = [
  { key: "country", label: "Country", value: (r) => countryLabel(r.country) },
  ...metricColumns<CountryRow>(),
];

const DEVICE_COLUMNS: Column<DeviceRow>[] = [
  {
    key: "device", label: "Device", value: (r) => r.device,
    render: (r) => {
      const Icon = DEVICE_ICONS[r.device] ?? Monitor;
      return (
        <span className="inline-flex items-center gap-2 capitalize">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {r.device}
        </span>
      );
    },
  },
  ...metricColumns<DeviceRow>({ funnel: true }),
];

const RECENT_COLUMNS: Column<RecentRow>[] = [
  {
    key: "at", label: "When", value: (r) => new Date(r.at).toISOString(),
    render: (r) => <span className="whitespace-nowrap">{formatDistanceToNowStrict(r.at, { addSuffix: true })}</span>,
  },
  {
    key: "visitor", label: "Visitor", value: (r) => r.visitor ?? "",
    render: (r) => (r.visitor ? <span className="font-mono text-xs">#{r.visitor}</span> : "—"),
  },
  {
    key: "type", label: "Activity", value: (r) => r.type,
    render: (r) =>
      r.type === "purchase" ? (
        <span className="font-medium text-green-600">Purchased {r.value != null ? fmtMoney(r.value) : ""}</span>
      ) : (
        EVENT_LABELS[r.type] ?? r.type
      ),
  },
  { key: "path", label: "Page", value: (r) => r.path ?? "", render: (r) => <span className="break-all">{r.path ?? "—"}</span> },
  { key: "source", label: "Came from", value: (r) => r.source ?? "", render: (r) => r.source ?? "" },
  { key: "country", label: "Country", value: (r) => countryLabel(r.country) },
  { key: "device", label: "Device", value: (r) => r.device ?? "", render: (r) => <span className="capitalize">{r.device ?? ""}</span> },
];

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="whitespace-nowrap">{current ? "new" : "—"}</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center whitespace-nowrap font-medium ${up ? "text-green-600" : "text-red-600"}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Kpi(props: { label: string; icon: typeof Users; value: string; current: number; previous: number; hint: string }) {
  const Icon = props.icon;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground" title={props.hint}>
          {props.label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums" data-testid={`kpi-${props.label.toLowerCase().replace(/\W+/g, "-")}`}>
          {props.value}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          <Change current={props.current} previous={props.previous} />
          <span className="whitespace-nowrap">vs previous period</span>
        </p>
      </CardContent>
    </Card>
  );
}

function TrendChart({ daily }: { daily: DailyRow[] }) {
  const [mode, setMode] = useState<"traffic" | "revenue">("traffic");
  const dayTooltip = (label: unknown) => longDay(String(label));
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Daily trend</CardTitle>
          <CardDescription>{mode === "traffic" ? "Visitors and orders per day" : "Revenue per day"}</CardDescription>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === "traffic" ? "secondary" : "ghost"} onClick={() => setMode("traffic")}>
            Visitors & orders
          </Button>
          <Button size="sm" variant={mode === "revenue" ? "secondary" : "ghost"} onClick={() => setMode("revenue")}>
            Revenue
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {mode === "traffic" ? (
            <ComposedChart data={daily} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tickFormatter={shortDay} className="text-xs" minTickGap={20} />
              <YAxis yAxisId="visitors" allowDecimals={false} className="text-xs" />
              <YAxis yAxisId="orders" orientation="right" allowDecimals={false} className="text-xs" />
              <Tooltip labelFormatter={dayTooltip} formatter={(value: number, name: string) => [fmtInt(value), name]} />
              <Legend />
              <Area
                yAxisId="visitors" type="monotone" dataKey="visitors" name="Visitors"
                stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={2}
              />
              <Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          ) : (
            <BarChart data={daily} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tickFormatter={shortDay} className="text-xs" minTickGap={20} />
              <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
              <Tooltip labelFormatter={dayTooltip} formatter={(value: number) => [fmtMoney(value), "Revenue"]} />
              <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Funnel({ funnel }: { funnel: AnalyticsReport["funnel"] }) {
  const steps = [
    { label: "Visits", value: funnel.sessions },
    { label: "Viewed a product", value: funnel.productViews },
    { label: "Added to cart", value: funnel.carts },
    { label: "Started checkout", value: funnel.checkouts },
    { label: "Purchased", value: funnel.purchases },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales funnel</CardTitle>
        <CardDescription>How far visits get before leaving</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="tabular-nums">
                {fmtInt(step.value)}
                <span className="ml-2 text-xs text-muted-foreground">{fmtPct(rate(step.value, funnel.sessions))}</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${funnel.sessions ? Math.max(step.value ? 2 : 0, rate(step.value, funnel.sessions)) : 0}%` }}
              />
            </div>
            {i > 0 && steps[i - 1].value > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {fmtPct(rate(step.value, steps[i - 1].value))} of the step before
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Section(props: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        {props.description && <CardDescription>{props.description}</CardDescription>}
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-4 text-sm" data-testid="analytics-notice">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState<Range>(() => PRESETS.find((p) => p.id === "30d")!.range());

  const { data, isLoading, error, isFetching, refetch } = useQuery<AnalyticsReport>({
    queryKey: ["/api/admin/analytics", range.from, range.to],
    queryFn: async () => {
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/admin/analytics?from=${range.from}&to=${range.to}&tz=${tz}`, { credentials: "include" });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      return body as AnalyticsReport;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const choosePreset = (id: string) => {
    setPreset(id);
    setRange(PRESETS.find((p) => p.id === id)!.range());
  };
  const setCustom = (part: keyof Range, value: string) => {
    if (!value) return;
    setPreset("custom");
    setRange((current) => {
      const next = { ...current, [part]: value };
      return next.from > next.to ? { from: value, to: value } : next;
    });
  };

  const t = data?.totals;
  const p = data?.previous;
  const rangeStartMs = parseDay(range.from).getTime();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics</h1>
            <p className="text-muted-foreground">Visitors, where they come from, and what they buy.</p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="inline-flex items-center gap-2 text-sm" data-testid="text-live-visitors">
                <span className={`h-2.5 w-2.5 rounded-full ${data.live.sessions ? "animate-pulse bg-green-500" : "bg-muted-foreground/40"}`} />
                {fmtInt(data.live.sessions)} online now
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-analytics">
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={preset === option.id ? "default" : "outline"}
              onClick={() => choosePreset(option.id)}
              data-testid={`button-range-${option.id}`}
            >
              {option.label}
            </Button>
          ))}
          <div className="flex items-center gap-2">
            <Input type="date" value={range.from} max={range.to} onChange={(e) => setCustom("from", e.target.value)} className="h-9 w-40" aria-label="From" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={range.to} min={range.from} onChange={(e) => setCustom("to", e.target.value)} className="h-9 w-40" aria-label="To" />
          </div>
        </div>

        {error && !data ? (
          <Card className="border-destructive/50">
            <CardContent className="py-6 text-sm text-destructive" data-testid="text-analytics-error">
              {(error as Error).message}
            </CardContent>
          </Card>
        ) : isLoading || !data || !t || !p ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
            <Skeleton className="h-[360px]" />
          </div>
        ) : (
          <>
            {data.trackingSince === null ? (
              <Notice>
                Visit tracking has just been switched on. Visitors, traffic sources and pages fill in as people browse the
                store. Orders and revenue already include your earlier sales.
              </Notice>
            ) : data.trackingSince > rangeStartMs ? (
              <Notice>
                Visit tracking started on {new Date(data.trackingSince).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                Earlier days in this range show orders and revenue only.
              </Notice>
            ) : null}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
              <Kpi label="Visitors" icon={Users} value={fmtInt(t.visitors)} current={t.visitors} previous={p.visitors}
                hint="Different people per day, added up over the period" />
              <Kpi label="Page views" icon={Eye} value={fmtInt(t.pageviews)} current={t.pageviews} previous={p.pageviews}
                hint="Every page opened" />
              <Kpi label="Orders" icon={ShoppingCart} value={fmtInt(t.orders)} current={t.orders} previous={p.orders}
                hint="Paid orders" />
              <Kpi label="Revenue" icon={DollarSign} value={fmtMoney(t.revenue)} current={t.revenue} previous={p.revenue}
                hint="Total of paid orders" />
              <Kpi label="Conversion rate" icon={Percent} value={fmtPct(t.conversionRate)} current={t.conversionRate}
                previous={p.conversionRate} hint="Orders divided by visits" />
              <Kpi label="Avg. order value" icon={Receipt} value={fmtMoney(t.averageOrder)} current={t.averageOrder}
                previous={p.averageOrder} hint="Revenue divided by orders" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <TrendChart daily={data.daily} />
              <Funnel funnel={data.funnel} />
            </div>

            <Tabs defaultValue="days" className="space-y-4">
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="days" data-testid="tab-days">By day</TabsTrigger>
                <TabsTrigger value="sources" data-testid="tab-sources">Traffic sources</TabsTrigger>
                <TabsTrigger value="pages" data-testid="tab-pages">Pages & products</TabsTrigger>
                <TabsTrigger value="audience" data-testid="tab-audience">Countries & devices</TabsTrigger>
                <TabsTrigger value="live" data-testid="tab-live">Live</TabsTrigger>
              </TabsList>

              <TabsContent value="days">
                <Section title="Day by day" description="Click any column to sort. Visits are counted from the store's own tracking; orders and revenue come from paid orders.">
                  <AnalyticsTable
                    rows={data.daily}
                    columns={DAY_COLUMNS}
                    defaultSort="day"
                    csvName={`daily-${range.from}-to-${range.to}`}
                    pageSize={31}
                    footer={
                      <TotalsRow
                        cells={[
                          { value: "Total" },
                          { value: fmtInt(t.visitors), numeric: true },
                          { value: fmtInt(t.sessions), numeric: true },
                          { value: fmtInt(t.pageviews), numeric: true },
                          { value: fmtInt(data.daily.reduce((s, d) => s + d.carts, 0)), numeric: true },
                          { value: fmtInt(data.daily.reduce((s, d) => s + d.checkouts, 0)), numeric: true },
                          { value: fmtInt(t.orders), numeric: true },
                          { value: fmtMoney(t.revenue), numeric: true },
                          { value: fmtPct(t.conversionRate), numeric: true },
                        ]}
                      />
                    }
                  />
                </Section>
              </TabsContent>

              <TabsContent value="sources" className="space-y-4">
                <Section
                  title="Traffic sources"
                  description="Where each visit started. Google Ads = ad clicks (gclid). Google Shopping = free product listings. Direct = typed address, bookmark or an app that hides where the visit came from."
                >
                  <AnalyticsTable rows={data.sources} columns={SOURCE_COLUMNS} defaultSort="sessions" csvName={`sources-${range.from}-to-${range.to}`} />
                </Section>
                <Section title="Referring websites" description="Other sites that sent visitors, by address.">
                  <AnalyticsTable rows={data.referrers} columns={REFERRER_COLUMNS} defaultSort="sessions" csvName={`referrers-${range.from}-to-${range.to}`}
                    emptyText="No visits from other websites in this period." />
                </Section>
                <Section title="Campaigns" description="Visits from links tagged with utm_source / utm_medium / utm_campaign.">
                  <AnalyticsTable rows={data.campaigns} columns={CAMPAIGN_COLUMNS} defaultSort="sessions" csvName={`campaigns-${range.from}-to-${range.to}`}
                    emptyText="No tagged campaign links were visited in this period." />
                </Section>
                <Section title="Landing pages" description="The first page of each visit.">
                  <AnalyticsTable rows={data.landingPages} columns={LANDING_COLUMNS} defaultSort="sessions" csvName={`landing-pages-${range.from}-to-${range.to}`} />
                </Section>
              </TabsContent>

              <TabsContent value="pages" className="space-y-4">
                <Section title="Products" description="Product page views, add-to-carts and paid orders.">
                  <AnalyticsTable rows={data.products} columns={PRODUCT_COLUMNS} defaultSort="views" csvName={`products-${range.from}-to-${range.to}`} />
                </Section>
                <Section title="Top pages">
                  <AnalyticsTable rows={data.pages} columns={PAGE_COLUMNS} defaultSort="pageviews" csvName={`pages-${range.from}-to-${range.to}`} />
                </Section>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                <Section title="Countries">
                  <AnalyticsTable rows={data.countries} columns={COUNTRY_COLUMNS} defaultSort="sessions" csvName={`countries-${range.from}-to-${range.to}`} />
                </Section>
                <Section title="Devices">
                  <AnalyticsTable rows={data.devices} columns={DEVICE_COLUMNS} defaultSort="sessions" csvName={`devices-${range.from}-to-${range.to}`} />
                </Section>
              </TabsContent>

              <TabsContent value="live" className="space-y-4">
                <Section title="Right now" description="Visits active in the last 30 minutes. Refreshes every minute.">
                  <p className="text-3xl font-bold tabular-nums">{fmtInt(data.live.sessions)}</p>
                  {data.live.pages.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm">
                      {data.live.pages.map((page) => (
                        <li key={page.path} className="flex justify-between gap-4">
                          <span className="break-all">{page.path}</span>
                          <span className="tabular-nums text-muted-foreground">{fmtInt(page.sessions)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
                <Section title="Recent activity" description="The latest page views and checkout steps. Visitor numbers are anonymous.">
                  <AnalyticsTable rows={data.recent} columns={RECENT_COLUMNS} defaultSort="at" csvName="recent-activity" pageSize={20}
                    emptyText="No visits recorded yet." />
                </Section>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
