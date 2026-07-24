import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Eye,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DrawerSelect from "@/components/shared/DrawerSelect";

export default function OnlineOrders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["onlineOrders"],
    queryFn: () => base44.entities.OnlineOrder.list("-order_date"),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnlineOrder.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(["onlineOrders"]);
      const previousOrders = queryClient.getQueryData(["onlineOrders"]);
      queryClient.setQueryData(["onlineOrders"], (old = []) =>
        old.map(o => (o.id === id ? { ...o, ...data } : o))
      );
      return { previousOrders };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["onlineOrders"], context.previousOrders);
    },
    onSettled: () => {
      queryClient.invalidateQueries(["onlineOrders"]);
      setShowDetails(false);
    },
  });

  const syncToInventoryMutation = useMutation({
    mutationFn: async (order) => {
      // Update inventory for each item
      for (const item of order.items) {
        const inventoryRecords = await base44.entities.Inventory.filter({
          product_id: item.product_id,
          company_id: order.company_id
        });
        
        if (inventoryRecords.length > 0) {
          const inv = inventoryRecords[0];
          await base44.entities.Inventory.update(inv.id, {
            quantity: inv.quantity - item.quantity
          });
        }
      }

      // Create a sale record
      await base44.entities.Sale.create({
        company_id: order.company_id,
        invoice_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        sale_date: order.order_date,
        items: order.items,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: 'paid',
        amount_paid: order.total_amount,
        amount_due: 0,
        cashier: 'online_store',
        notes: `Online order - ${order.order_number}`
      });

      // Update order status
      return base44.entities.OnlineOrder.update(order.id, {
        order_status: 'processing',
        fulfillment_status: 'unfulfilled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["onlineOrders"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["sales"]);
      alert("Order synced to inventory successfully!");
    },
  });

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = (orderId, field, value) => {
    updateOrderMutation.mutate({
      id: orderId,
      data: { [field]: value }
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const pendingOrders = orders.filter(o => o.order_status === 'pending');
  const processingOrders = orders.filter(o => o.order_status === 'processing');
  const shippedOrders = orders.filter(o => o.order_status === 'shipped');

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Online Orders</h1>
        <p className="text-slate-500 mt-1">Manage e-commerce orders and fulfillment</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingOrders.length}</p>
              </div>
              <Package className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Processing</p>
                <p className="text-2xl font-bold text-blue-900">{processingOrders.length}</p>
              </div>
              <RefreshCw className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Shipped</p>
                <p className="text-2xl font-bold text-purple-900">{shippedOrders.length}</p>
              </div>
              <Truck className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Total Orders</p>
                <p className="text-2xl font-bold text-green-900">{orders.length}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Order #</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Total</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Payment</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <span className="font-medium text-blue-600">{order.order_number}</span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {format(new Date(order.order_date), "MMM d, yyyy")}
                      <div className="text-xs text-slate-400">
                        {format(new Date(order.order_date), "h:mm a")}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{order.customer_name}</div>
                      <div className="text-xs text-slate-500">{order.customer_email}</div>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      ₦{order.total_amount?.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <Badge className={getPaymentStatusColor(order.payment_status)}>
                        {order.payment_status}
                      </Badge>
                      <div className="text-xs text-slate-500 mt-1 capitalize">
                        {order.payment_method?.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="p-4">
                      <DrawerSelect
                        value={order.order_status}
                        onValueChange={(value) => handleStatusChange(order.id, 'order_status', value)}
                        options={[
                          { value: "pending", label: "Pending" },
                          { value: "processing", label: "Processing" },
                          { value: "shipped", label: "Shipped" },
                          { value: "delivered", label: "Delivered" },
                          { value: "cancelled", label: "Cancelled" },
                        ]}
                        triggerClassName="w-32 h-9 text-sm rounded-md border px-3"
                        label="Order Status"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {order.order_status === 'pending' && order.payment_status === 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => syncToInventoryMutation.mutate(order)}
                            disabled={syncToInventoryMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Sync
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No orders found</p>
              </div>
            )}
          </div>
          {/* Mobile card layout */}
          <div className="block md:hidden divide-y">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-600">{order.order_number}</span>
                  <Badge className={getPaymentStatusColor(order.payment_status)}>{order.payment_status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-900 font-medium truncate">{order.customer_name}</p>
                    <p className="text-xs text-slate-500 truncate">{order.customer_email}</p>
                    <p className="text-xs text-slate-500">{format(new Date(order.order_date), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <p className="font-bold text-slate-900 flex-shrink-0 ml-2">₦{order.total_amount?.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DrawerSelect
                    value={order.order_status}
                    onValueChange={(value) => handleStatusChange(order.id, "order_status", value)}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "processing", label: "Processing" },
                      { value: "shipped", label: "Shipped" },
                      { value: "delivered", label: "Delivered" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                    triggerClassName="w-32 h-9 text-sm rounded-md border px-3"
                    label="Order Status"
                  />
                  <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShowDetails(true); }}>
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  {order.order_status === "pending" && order.payment_status === "paid" && (
                    <Button size="sm" onClick={() => syncToInventoryMutation.mutate(order)} disabled={syncToInventoryMutation.isPending} className="bg-green-600 hover:bg-green-700">
                      <RefreshCw className="w-4 h-4 mr-1" /> Sync
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No orders found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Customer Information</h3>
                <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Name</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="font-medium">{selectedOrder.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Phone</p>
                    <p className="font-medium">{selectedOrder.customer_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Shipping Address</h3>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p>{selectedOrder.shipping_address.street}</p>
                    <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</p>
                    <p>{selectedOrder.shipping_address.postal_code}</p>
                    <p>{selectedOrder.shipping_address.country}</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Order Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Product</th>
                        <th className="text-right p-3 text-sm font-semibold">Qty</th>
                        <th className="text-right p-3 text-sm font-semibold">Price</th>
                        <th className="text-right p-3 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3">{item.product_name}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">₦{item.unit_price.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">₦{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₦{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-semibold">₦{selectedOrder.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span className="font-semibold">₦{selectedOrder.shipping_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-blue-600">₦{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Tracking */}
              {selectedOrder.tracking_number && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Tracking Information</h3>
                  <p className="text-slate-700">Tracking #: <span className="font-mono">{selectedOrder.tracking_number}</span></p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}