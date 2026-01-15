"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import * as analyticsApi from "@/lib/api/analytics";
import * as menuApi from "@/lib/api/menu";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, Edit } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// KPI Card Component
const KPICard = ({ title, value, change, changeType, description, icon }: {
  title: string;
  value: string | number;
  change?: string | number;
  changeType?: string;
  description?: string;
  icon?: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className={`text-xs ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {changeType === 'positive' ? '+' : ''}{change} from last period
        </p>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState({
    orders: {
      totalOrders: 0,
      completedOrders: 0,
      completionRate: 0,
      averageOrderValue: 0,
      basketSize: 0,
      totalRevenue: 0
    },
    revenue: {
      totalRevenue: 0,
      netRevenue: 0,
      totalDiscounts: 0,
      avgOrderValue: 0
    },
    users: {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      returningUsers: 0
    },
    products: {
      topSelling: [] as Array<{
        productId: string;
        productName: string;
        category: string;
        totalRevenue: number;
        totalSold: number;
      }>,
      categoryPerformance: []
    }
  });
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch expiring items
  useEffect(() => {
    const fetchExpiringItems = async () => {
      try {
        const res = await menuApi.getMenuItems({ limit: 100 });
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const expiring = res.menuItems.filter((item: any) => {
          if (!item.specialOffer?.isSpecial || !item.specialOffer?.validUntil) return false;
          const expiryDate = new Date(item.specialOffer.validUntil);
          return expiryDate > now && expiryDate < tomorrow;
        });
        
        setExpiringItems(expiring);
      } catch (err) {
        console.error("Error fetching expiring items:", err);
      }
    };
    fetchExpiringItems();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all analytics in parallel using the centralized API
        const [
          ordersRes,
          revenueRes,
          usersRes,
          productsRes
        ] = await Promise.all([
          analyticsApi.getOrderOverview('30d'),
          analyticsApi.getRevenueOverview('30d'),
          analyticsApi.getUserOverview('30d'),
          analyticsApi.getTopSellingProducts('30d', 5)
        ]);

        setAnalytics({
          orders: ordersRes.data || {
            totalOrders: 0,
            completedOrders: 0,
            completionRate: 0,
            averageOrderValue: 0,
            basketSize: 0,
            totalRevenue: 0
          },
          revenue: revenueRes.data || {
            totalRevenue: 0,
            netRevenue: 0,
            totalDiscounts: 0,
            avgOrderValue: 0
          },
          users: usersRes.data || {
            totalUsers: 0,
            activeUsers: 0,
            newUsers: 0,
            returningUsers: 0
          },
          products: {
            topSelling: productsRes.data || [],
            categoryPerformance: []
          }
        });

      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
      </div>

      {/* Notifications/Alerts */}
      {expiringItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base font-semibold text-amber-800">
              Expiring Menu Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-3">
              The following {expiringItems.length} items will expire within the next 24 hours and will be hidden from customers.
            </p>
            <div className="flex flex-wrap gap-2">
              {expiringItems.map((item) => (
                <Link key={item.id} href={`/dashboard/menu?search=${encodeURIComponent(item.name)}`}>
                  <Badge variant="outline" className="bg-white border-amber-200 hover:bg-amber-100 cursor-pointer flex items-center gap-1 group">
                    <Clock className="h-3 w-3" />
                    {item.name}
                    <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Orders"
          value={analytics.orders.totalOrders || 0}
          description={`${analytics.orders.completedOrders || 0} completed`}
        />
        <KPICard
          title="Total Revenue"
          value={`₹${(analytics.orders.totalRevenue || 0).toLocaleString()}`}
          description={`Net: ₹${(analytics.revenue.netRevenue || 0).toLocaleString()}`}
        />
        <KPICard
          title="Active Users"
          value={analytics.users.activeUsers || 0}
          description={`${analytics.users.newUsers || 0} new this period`}
        />
        <KPICard
          title="Avg Order Value"
          value={`₹${(analytics.orders.averageOrderValue || 0).toFixed(0)}`}
          description={`${(analytics.orders.basketSize || 0).toFixed(1)} items avg`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Order Completion Rate"
          value={`${(analytics.orders.completionRate || 0).toFixed(1)}%`}
          description="Orders completed vs started"
        />
        <KPICard
          title="Net Revenue"
          value={`₹${(analytics.revenue.netRevenue || 0).toLocaleString()}`}
          description={`₹${(analytics.revenue.totalDiscounts || 0).toLocaleString()} in discounts`}
        />
        <KPICard
          title="New vs Returning"
          value={`${analytics.users.newUsers || 0}/${analytics.users.returningUsers || 0}`}
          description="New/Returning users"
        />
        <KPICard
          title="Avg Order Value"
          value={`₹${(analytics.revenue.avgOrderValue || 0).toFixed(0)}`}
          description={`₹${(analytics.revenue.totalDiscounts || 0).toLocaleString()} in discounts`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performing items this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.products.topSelling.slice(0, 5).map((product) => (
                <div key={product.productId} className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{(product.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{product.totalSold || 0} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Current order distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <span className="text-sm font-medium">{analytics.orders.completedOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <span className="text-sm font-medium">
                  {(analytics.orders.totalOrders || 0) - (analytics.orders.completedOrders || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completion Rate</span>
                <span className="text-sm font-medium">{(analytics.orders.completionRate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
              
    </div>
  );
}
