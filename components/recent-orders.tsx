

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CheckCircle, Clock, CookingPot, Truck, XCircle } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type OrderStatus = "Ordered" | "Preparing" | "Dispatched" | "Delivered" | "Canceled";

export interface RecentOrder {
  id: string;
  userId: string;
  user: { name: string; id: string };
  chef?: { name: string; id: string };
  billing: { totalAmount: number };
  status: string;
  createdAt: string;
}

const statusIcon = (status: OrderStatus) => {
  switch (status) {
    case "Ordered":
      return <Clock className="h-4 w-4" />
    case "Preparing":
      return <CookingPot className="h-4 w-4" />
    case "Dispatched":
      return <Truck className="h-4 w-4" />
    case "Delivered":
      return <CheckCircle className="h-4 w-4" />
    case "Canceled":
      return <XCircle className="h-4 w-4" />
  }
}




export function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchOrders = async () => {
      try {
        const res = await api.get('/admin/recent-orders');
        setOrders(Array.isArray(res.data.orders) ? res.data.orders : []);
      } catch (err) {
        let message = "Failed to load recent orders.";
        if (err && typeof err === "object") {
          if (err instanceof Error) message = err.message;
          else if (typeof (err as { message?: unknown }).message === "string") message = (err as { message: string }).message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-4">
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {!loading && !error && orders.length === 0 && <div>No recent orders found.</div>}
      {!loading && !error && orders.map((order, idx) => (
        <div key={order.id ?? idx} className="flex items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="font-medium">{order.id}</span>
              <StatusBadge
                status={order.status}
                category="order"
                compact
                className="ml-2"
                ariaLabel={`Order status: ${order.status}`}
                icon={statusIcon(order.status as OrderStatus)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              User: {order.userId ?? '-'}
              {order.chef && ` | Chef: ${order.chef.name}`}
            </div>
            <div className="text-sm font-medium">
              ₹{order.billing.totalAmount?? 0} • {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
          {/* <Button variant="ghost" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button> */}
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          try {
            router.push("/dashboard/orders");
          } catch (err) {
            alert("Failed to redirect to orders page.");
            console.log(err);
          }
        }}
      >
        View All Orders
      </Button>
    </div>
  );
}


