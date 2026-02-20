import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Mail, Loader2, ChevronDown, ChevronRight, Phone, User, CreditCard, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface Order {
  id: string;
  customerEmail: string;
  customerName: string | null;
  phone: string | null;
  country: string | null;
  amount: string;
  status: string;
  paymentMethod: string | null;
  productIds: string[] | null;
  productTitles: string[] | null;
  createdAt: string;
}

interface AbandonedCart {
  id: string;
  sessionId: string;
  email: string | null;
  customerName: string | null;
  phone: string | null;
  productIds: string[] | null;
  productTitles: string[] | null;
  totalAmount: string | null;
  createdAt: string;
  recoveryEmailSent: boolean;
}

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedCarts, setExpandedCarts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/orders${params}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: abandonedCarts, isLoading: cartsLoading } = useQuery<AbandonedCart[]>({
    queryKey: ["/api/admin/abandoned-carts"],
  });

  const sendRecoveryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/abandoned-carts/${id}/send-recovery`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/abandoned-carts"] });
      toast({ title: "Recovery email sent", description: "The customer will receive a reminder email." });
    },
    onError: () => {
      toast({ title: "Failed to send email", variant: "destructive" });
    },
  });

  const toggleOrder = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCart = (id: string) => {
    setExpandedCarts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      refunded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <Badge className={styles[status] || ""} variant="secondary">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentBadge = (method: string | null) => {
    if (!method) return <span className="text-muted-foreground">—</span>;
    const styles: Record<string, string> = {
      stripe: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      paypal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return (
      <Badge className={styles[method] || ""} variant="outline">
        <CreditCard className="w-3 h-3 mr-1" />
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Badge>
    );
  };

  const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.amount), 0) || 0;
  const paidOrders = orders?.filter((o) => o.status === "paid").length || 0;
  const abandonedValue = abandonedCarts?.reduce((sum, c) => sum + parseFloat(c.totalAmount || "0"), 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-orders-title">Order Management</h1>
          <p className="text-muted-foreground">View and manage all orders and abandoned carts.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">${totalRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold" data-testid="text-paid-orders">{paidOrders}</div>
              <p className="text-sm text-muted-foreground">Paid Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500" data-testid="text-abandoned-value">${abandonedValue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Abandoned Cart Value</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders" data-testid="tab-orders">
              Orders {orders?.length ? `(${orders.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="abandoned" data-testid="tab-abandoned">
              Abandoned Carts {abandonedCarts?.length ? `(${abandonedCarts.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>All Orders</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-orders"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : orders && orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const isExpanded = expandedOrders.has(order.id);
                          return (
                            <>
                              <TableRow
                                key={order.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleOrder(order.id)}
                                data-testid={`row-order-${order.id}`}
                              >
                                <TableCell>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {order.id.substring(0, 8)}...
                                </TableCell>
                                <TableCell>
                                  <div>
                                    {order.customerName && <div className="font-medium text-sm">{order.customerName}</div>}
                                    <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  ${parseFloat(order.amount).toFixed(2)}
                                </TableCell>
                                <TableCell>{getPaymentBadge(order.paymentMethod)}</TableCell>
                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow key={`${order.id}-details`}>
                                  <TableCell colSpan={7} className="bg-muted/30 p-0">
                                    <div className="p-4 space-y-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Customer Details
                                          </div>
                                          <div className="text-sm pl-6">
                                            <p>{order.customerName || "—"}</p>
                                            <p className="text-muted-foreground">{order.customerEmail}</p>
                                            {order.phone && (
                                              <p className="flex items-center gap-1 text-muted-foreground">
                                                <Phone className="w-3 h-3" /> {order.phone}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                                            Payment Info
                                          </div>
                                          <div className="text-sm pl-6">
                                            <p>Method: {order.paymentMethod || "—"}</p>
                                            <p>Amount: ${parseFloat(order.amount).toFixed(2)}</p>
                                            <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <Package className="w-4 h-4 text-muted-foreground" />
                                            Products ({order.productTitles?.length || 0})
                                          </div>
                                          <ul className="text-sm pl-6 space-y-1">
                                            {order.productTitles?.map((title, i) => (
                                              <li key={i} className="text-muted-foreground truncate max-w-xs" title={title}>
                                                {title}
                                              </li>
                                            )) || <li className="text-muted-foreground">No product data</li>}
                                          </ul>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground pt-2 border-t">
                                        Full ID: {order.id}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No orders found.</p>
                    <p className="text-sm mt-1">Orders will appear here once customers complete purchases.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abandoned" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Abandoned Carts</CardTitle>
              </CardHeader>
              <CardContent>
                {cartsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : abandonedCarts && abandonedCarts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abandonedCarts.map((cart) => {
                          const isExpanded = expandedCarts.has(cart.id);
                          return (
                            <>
                              <TableRow
                                key={cart.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleCart(cart.id)}
                                data-testid={`row-abandoned-${cart.id}`}
                              >
                                <TableCell>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </TableCell>
                                <TableCell>
                                  {cart.customerName || <span className="text-muted-foreground font-mono text-xs">{cart.sessionId.substring(0, 8)}...</span>}
                                </TableCell>
                                <TableCell>{cart.email || "—"}</TableCell>
                                <TableCell className="font-semibold">
                                  {cart.totalAmount ? `$${parseFloat(cart.totalAmount).toFixed(2)}` : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {new Date(cart.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant={cart.recoveryEmailSent ? "secondary" : "default"}
                                    disabled={cart.recoveryEmailSent || !cart.email || sendRecoveryMutation.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendRecoveryMutation.mutate(cart.id);
                                    }}
                                    data-testid={`button-recovery-${cart.id}`}
                                  >
                                    {sendRecoveryMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : cart.recoveryEmailSent ? (
                                      "Sent"
                                    ) : (
                                      <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send Recovery
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow key={`${cart.id}-details`}>
                                  <TableCell colSpan={6} className="bg-muted/30 p-0">
                                    <div className="p-4 space-y-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Customer Details
                                          </div>
                                          <div className="text-sm pl-6">
                                            <p>{cart.customerName || "Anonymous"}</p>
                                            <p className="text-muted-foreground">{cart.email || "No email provided"}</p>
                                            {cart.phone && (
                                              <p className="flex items-center gap-1 text-muted-foreground">
                                                <Phone className="w-3 h-3" /> {cart.phone}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                                            Cart Products ({cart.productTitles?.length || cart.productIds?.length || 0})
                                          </div>
                                          <ul className="text-sm pl-6 space-y-1">
                                            {cart.productTitles?.map((title, i) => (
                                              <li key={i} className="text-muted-foreground truncate max-w-xs" title={title}>
                                                {title}
                                              </li>
                                            )) || cart.productIds?.map((pid, i) => (
                                              <li key={i} className="text-muted-foreground font-mono text-xs">
                                                Product #{pid}
                                              </li>
                                            )) || <li className="text-muted-foreground">No product data</li>}
                                          </ul>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground pt-2 border-t">
                                        Session: {cart.sessionId} | Abandoned: {new Date(cart.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No abandoned carts found.</p>
                    <p className="text-sm mt-1">Carts left without checkout will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
