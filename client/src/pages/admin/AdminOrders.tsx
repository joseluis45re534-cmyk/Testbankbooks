import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Mail, Loader2 } from "lucide-react";
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
  productIds: string[] | null;
  totalAmount: string | null;
  createdAt: string;
  recoveryEmailSent: boolean;
}

export default function AdminOrders() {
  const [search, setSearch] = useState("");
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-orders-title">Order Management</h1>
          <p className="text-muted-foreground">View and manage all orders and abandoned carts.</p>
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
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer Email</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                            <TableCell className="font-mono text-sm">
                              {order.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>{order.customerEmail}</TableCell>
                            <TableCell>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              ${parseFloat(order.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                          </TableRow>
                        ))}
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
                          <TableHead>Session ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abandonedCarts.map((cart) => (
                          <TableRow key={cart.id} data-testid={`row-abandoned-${cart.id}`}>
                            <TableCell className="font-mono text-sm">
                              {cart.sessionId.substring(0, 8)}...
                            </TableCell>
                            <TableCell>{cart.email || "—"}</TableCell>
                            <TableCell>
                              {cart.totalAmount ? `$${parseFloat(cart.totalAmount).toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell>
                              {new Date(cart.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={cart.recoveryEmailSent ? "secondary" : "default"}
                                disabled={cart.recoveryEmailSent || !cart.email || sendRecoveryMutation.isPending}
                                onClick={() => sendRecoveryMutation.mutate(cart.id)}
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
                        ))}
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
