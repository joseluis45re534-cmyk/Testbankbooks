import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, CreditCard, DollarSign, Eye, EyeOff, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface PaymentSetting {
  id: string;
  provider: string;
  enabled: boolean;
  config: string | null;
  updatedAt: string;
}

function MaskedInput({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  testId: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
        data-testid={testId}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0"
        onClick={() => setVisible(!visible)}
        data-testid={`${testId}-toggle`}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();

  const [paypalConfig, setPaypalConfig] = useState({ clientId: "", clientSecret: "", enabled: false });
  const [stripeConfig, setStripeConfig] = useState({ publishableKey: "", secretKey: "", enabled: false });
  const [htmlTags, setHtmlTags] = useState({ headerHtml: "", bodyHtml: "", footerHtml: "" });

  const { data: settings, isLoading } = useQuery<PaymentSetting[]>({
    queryKey: ["/api/admin/payment-settings"],
  });

  const { data: customHtml, isLoading: htmlLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings/custom-html"],
  });

  useEffect(() => {
    if (customHtml) {
      setHtmlTags({
        headerHtml: customHtml.headerHtml || "",
        bodyHtml: customHtml.bodyHtml || "",
        footerHtml: customHtml.footerHtml || "",
      });
    }
  }, [customHtml]);

  useEffect(() => {
    if (settings) {
      const paypal = settings.find((s) => s.provider === "paypal");
      const stripe = settings.find((s) => s.provider === "stripe");

      if (paypal?.config) {
        try {
          const config = JSON.parse(paypal.config);
          setPaypalConfig({ clientId: config.clientId || "", clientSecret: config.clientSecret || "", enabled: paypal.enabled ?? false });
        } catch {}
      } else if (paypal) {
        setPaypalConfig((prev) => ({ ...prev, enabled: paypal.enabled ?? false }));
      }
      if (stripe?.config) {
        try {
          const config = JSON.parse(stripe.config);
          setStripeConfig({ publishableKey: config.publishableKey || "", secretKey: config.secretKey || "", enabled: stripe.enabled ?? false });
        } catch {}
      } else if (stripe) {
        setStripeConfig((prev) => ({ ...prev, enabled: stripe.enabled ?? false }));
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: { provider: string; enabled: boolean; config?: string }) =>
      apiRequest("POST", "/api/admin/payment-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const saveHtmlMutation = useMutation({
    mutationFn: async (data: { headerHtml: string; bodyHtml: string; footerHtml: string }) =>
      apiRequest("POST", "/api/admin/site-settings/custom-html", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings/custom-html"] });
      toast({ title: "Custom HTML tags saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save custom HTML tags", variant: "destructive" });
    },
  });

  const handleSaveHtml = () => {
    saveHtmlMutation.mutate(htmlTags);
  };

  const handleSaveStripe = () => {
    saveMutation.mutate({
      provider: "stripe",
      enabled: stripeConfig.enabled,
      config: JSON.stringify({
        publishableKey: stripeConfig.publishableKey,
        secretKey: stripeConfig.secretKey,
      }),
    });
  };

  const handleSavePaypal = () => {
    saveMutation.mutate({
      provider: "paypal",
      enabled: paypalConfig.enabled,
      config: JSON.stringify({
        clientId: paypalConfig.clientId,
        clientSecret: paypalConfig.clientSecret,
      }),
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">API Key Settings</h1>
          <p className="text-muted-foreground">Manage your payment gateway API keys. Keys saved here override environment variables.</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Stripe</CardTitle>
                    <CardDescription>Accept credit/debit card payments</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={stripeConfig.enabled}
                  onCheckedChange={(checked) => setStripeConfig({ ...stripeConfig, enabled: checked })}
                  data-testid="switch-stripe"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Publishable Key</label>
                <MaskedInput
                  placeholder="pk_live_... or pk_test_..."
                  value={stripeConfig.publishableKey}
                  onChange={(val) => setStripeConfig({ ...stripeConfig, publishableKey: val })}
                  testId="input-stripe-publishable-key"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Key</label>
                <MaskedInput
                  placeholder="sk_live_... or sk_test_..."
                  value={stripeConfig.secretKey}
                  onChange={(val) => setStripeConfig({ ...stripeConfig, secretKey: val })}
                  testId="input-stripe-secret-key"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If left empty, the system will use the keys from environment variables.
              </p>
              <Button
                onClick={handleSaveStripe}
                disabled={saveMutation.isPending}
                data-testid="button-save-stripe"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Stripe Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>PayPal</CardTitle>
                    <CardDescription>Accept payments via PayPal</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={paypalConfig.enabled}
                  onCheckedChange={(checked) => setPaypalConfig({ ...paypalConfig, enabled: checked })}
                  data-testid="switch-paypal"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID</label>
                <MaskedInput
                  placeholder="Enter PayPal Client ID"
                  value={paypalConfig.clientId}
                  onChange={(val) => setPaypalConfig({ ...paypalConfig, clientId: val })}
                  testId="input-paypal-client-id"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Secret</label>
                <MaskedInput
                  placeholder="Enter PayPal Client Secret"
                  value={paypalConfig.clientSecret}
                  onChange={(val) => setPaypalConfig({ ...paypalConfig, clientSecret: val })}
                  testId="input-paypal-client-secret"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If left empty, the system will use the keys from environment variables.
              </p>
              <Button
                onClick={handleSavePaypal}
                disabled={saveMutation.isPending}
                data-testid="button-save-paypal"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save PayPal Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-html-tags-title">Custom HTML Tags</h2>
          <p className="text-muted-foreground mb-6">Add custom scripts and tags to your site. Useful for analytics, tracking pixels, and other third-party integrations.</p>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Code className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Header Tags</CardTitle>
                    <CardDescription>Code added inside the &lt;head&gt; section. Use for meta tags, stylesheets, analytics scripts (e.g., Google Analytics, Facebook Pixel).</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={'<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>'}
                  value={htmlTags.headerHtml}
                  onChange={(e) => setHtmlTags({ ...htmlTags, headerHtml: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                  data-testid="textarea-header-html"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <Code className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Body Tags (Opening)</CardTitle>
                    <CardDescription>Code added right after the opening &lt;body&gt; tag. Use for noscript tags, chat widgets, or tag manager body snippets.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={'<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXX"></iframe></noscript>'}
                  value={htmlTags.bodyHtml}
                  onChange={(e) => setHtmlTags({ ...htmlTags, bodyHtml: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                  data-testid="textarea-body-html"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Code className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Footer Tags</CardTitle>
                    <CardDescription>Code added before the closing &lt;/body&gt; tag. Use for scripts that should load last, conversion tracking, or custom JavaScript.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={'<script>console.log("Custom footer script loaded");</script>'}
                  value={htmlTags.footerHtml}
                  onChange={(e) => setHtmlTags({ ...htmlTags, footerHtml: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                  data-testid="textarea-footer-html"
                />
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveHtml}
              disabled={saveHtmlMutation.isPending}
              className="w-fit"
              data-testid="button-save-html-tags"
            >
              {saveHtmlMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save HTML Tags
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
