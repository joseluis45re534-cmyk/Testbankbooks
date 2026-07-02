import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Download, Mail, HelpCircle, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface OrderProduct {
  id: string;
  title: string;
  price: string;
  imageUrl: string | null;
}

interface OrderDetails {
  id: string;
  customerEmail: string;
  amount: string;
  status: string;
  paymentMethod: string | null;
  productIds: string[] | null;
  productTitles: string[] | null;
  createdAt: string;
  products: OrderProduct[];
}

interface DownloadToken {
  productId: string;
  productTitle: string;
  downloadUrl: string;
}

export default function ThankYou() {
  const params = useParams<{ orderId: string }>();
  const [downloadTokens, setDownloadTokens] = useState<DownloadToken[]>([]);

  const { data: order, isLoading, error } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", params.orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${params.orderId}`);
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    },
    enabled: !!params.orderId,
  });

  const generateDownloadsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/orders/${params.orderId}/generate-download`);
    },
    onSuccess: async (response: any) => {
      const data = await response.json();
      setDownloadTokens(data.tokens || []);
    },
  });

  useEffect(() => {
    if (order && (order.status === "paid" || order.status === "completed") && downloadTokens.length === 0) {
      generateDownloadsMutation.mutate();
    }
  }, [order]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  const handleDownload = (token: DownloadToken) => {
    window.location.href = token.downloadUrl;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find this order. Please check your order confirmation email or contact support.
            </p>
            <Link href="/">
              <Button data-testid="button-back-home">Return to Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background select-none">
      <Header cartCount={0} />
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-thank-you-title">
              Thank You for Your Purchase!
            </h1>
            <p className="text-muted-foreground">
              Your order is confirmed. Your digital copy is ready to access right now below.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-mono font-medium" data-testid="text-order-number">
                    #{order.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium" data-testid="text-customer-email">
                    {order.customerEmail}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span>{order.paymentMethod || "Card"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {order.status === "paid" ? "Paid" : order.status}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="text-order-total">${parseFloat(order.amount).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.products.map((product) => (
                    <div key={product.id} className="flex gap-3" data-testid={`product-${product.id}`}>
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-2 text-sm">{product.title}</p>
                        <p className="text-sm text-muted-foreground">${product.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Your Free Digital Copy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generateDownloadsMutation.isPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Preparing your downloads...</span>
                </div>
              ) : downloadTokens.length > 0 ? (
                <div className="space-y-4">
                  {downloadTokens.map((token) => (
                    <div
                      key={token.productId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{token.productTitle}</p>
                      </div>
                      {token.downloadUrl ? (
                        <a href={token.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                            data-testid={`button-download-${token.productId}`}
                          >
                            <Download className="w-5 h-5 mr-2" />
                            Download Digital Copy
                          </Button>
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Download not available</span>
                      )}
                    </div>
                  ))}
                  </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Download links will appear here once your payment is verified.</p>
                  <p className="text-sm mt-2">This usually takes a few seconds.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 bg-muted/30">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-background">
                  <HelpCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <p className="font-medium">Need Help?</p>
                  <p className="text-sm text-muted-foreground">
                    If your download doesn't start or you have any issues, please contact us.
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href="mailto:support@nurstestbank.com" data-testid="link-contact-support">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <Link href="/shop">
              <Button variant="outline" data-testid="button-continue-shopping">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
