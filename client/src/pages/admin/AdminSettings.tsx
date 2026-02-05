import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, CreditCard, Bitcoin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface PaymentConfig {
  clientId?: string;
  clientSecret?: string;
  publishableKey?: string;
  secretKey?: string;
  enabled?: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();

  const [paypalConfig, setPaypalConfig] = useState({ clientId: "", clientSecret: "", enabled: false });
  const [stripeConfig, setStripeConfig] = useState({ publishableKey: "", secretKey: "", enabled: false });
  const [cryptoEnabled, setCryptoEnabled] = useState(false);

  const { data: settings, isLoading } = useQuery<PaymentSetting[]>({
    queryKey: ["/api/admin/payment-settings"],
  });

  useEffect(() => {
    if (settings) {
      const paypal = settings.find((s) => s.provider === "paypal");
      const stripe = settings.find((s) => s.provider === "stripe");
      const crypto = settings.find((s) => s.provider === "crypto");

      if (paypal?.config) {
        try {
          const config = JSON.parse(paypal.config);
          setPaypalConfig({ ...config, enabled: paypal.enabled });
        } catch {}
      }
      if (stripe?.config) {
        try {
          const config = JSON.parse(stripe.config);
          setStripeConfig({ ...config, enabled: stripe.enabled });
        } catch {}
      }
      if (crypto) {
        setCryptoEnabled(crypto.enabled ?? false);
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

  const handleSaveCrypto = () => {
    saveMutation.mutate({
      provider: "crypto",
      enabled: cryptoEnabled,
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
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">Payment Settings</h1>
          <p className="text-muted-foreground">Configure your payment gateway credentials.</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
              <div>
                <label className="text-sm font-medium">Client ID</label>
                <Input
                  type="password"
                  placeholder="Enter PayPal Client ID"
                  value={paypalConfig.clientId}
                  onChange={(e) => setPaypalConfig({ ...paypalConfig, clientId: e.target.value })}
                  data-testid="input-paypal-client-id"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Client Secret</label>
                <Input
                  type="password"
                  placeholder="Enter PayPal Client Secret"
                  value={paypalConfig.clientSecret}
                  onChange={(e) => setPaypalConfig({ ...paypalConfig, clientSecret: e.target.value })}
                  data-testid="input-paypal-client-secret"
                />
              </div>
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
              <div>
                <label className="text-sm font-medium">Publishable Key</label>
                <Input
                  type="password"
                  placeholder="pk_live_..."
                  value={stripeConfig.publishableKey}
                  onChange={(e) => setStripeConfig({ ...stripeConfig, publishableKey: e.target.value })}
                  data-testid="input-stripe-publishable-key"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Secret Key</label>
                <Input
                  type="password"
                  placeholder="sk_live_..."
                  value={stripeConfig.secretKey}
                  onChange={(e) => setStripeConfig({ ...stripeConfig, secretKey: e.target.value })}
                  data-testid="input-stripe-secret-key"
                />
              </div>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <Bitcoin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Crypto / Manual Payments</CardTitle>
                    <CardDescription>Accept cryptocurrency or manual bank transfers</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={cryptoEnabled}
                  onCheckedChange={setCryptoEnabled}
                  data-testid="switch-crypto"
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                When enabled, customers will see an option to pay via cryptocurrency or manual bank transfer at checkout.
              </p>
              <Button
                onClick={handleSaveCrypto}
                disabled={saveMutation.isPending}
                data-testid="button-save-crypto"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Crypto Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
