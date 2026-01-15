"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Bar,
  Doughnut
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useToast } from "@/hooks/use-toast";
import { DateRangeSelector } from "@/components/date-range-selector";
import * as analytics from "@/lib/api/analytics";
import type { TimePeriod, PeakOrderTimes } from "@/lib/api/analytics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Metric Card Component
const MetricCard = ({ title, value, subtitle, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { type: string; value: string };
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className={`text-xs mt-2 ${trend.type === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {trend.value}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function OrdersAnalyticsPage() {
  const [orderData, setOrderData] = useState<{
    totalOrders: number;
    completedOrders: number;
    completionRate: number;
    averageOrderValue: number;
    basketSize: number;
    totalRevenue: number;
    breakdown?: {
      dayPart?: Record<string, number>;
      orderType?: Record<string, number>;
      status?: {
        completed: number;
        cancelled: number;
        pending: number;
      };
    };
    firstTimeOrderRate?: number;
    repeatOrderRate?: number;
  }>({
    totalOrders: 0,
    completedOrders: 0,
    completionRate: 0,
    averageOrderValue: 0,
    basketSize: 0,
    totalRevenue: 0,
    breakdown: {
      dayPart: {},
      orderType: {},
      status: {
        completed: 0,
        cancelled: 0,
        pending: 0
      }
    }
  });
  const [abandonedData, setAbandonedData] = useState({
    totalCarts: 0,
    abandonedCarts: 0,
    abandonedRate: 0,
    recoveredCarts: 0,
    recoveryRate: 0
  });
  const [peakData, setPeakData] = useState<{
    totalDataPoints?: number;
    peakOrderTime?: { dayOfWeek: string; hour: number; dayPart: string; orderCount: number; totalRevenue: number; avgOrderValue: number } | null;
    avgOrdersPerHour?: number;
    top10PeakTimes?: Array<{ dayOfWeek: string; hour: number; dayPart: string; orderCount: number; totalRevenue: number; avgOrderValue: number }>;
  }>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrderAnalytics = async () => {
      setLoading(true);
      try {
        const [ordersRes, abandonedRes, peakRes] = await Promise.all([
          analytics.getOrderOverview(period),
          analytics.getAbandonedCarts(period),
          analytics.getPeakOrderTimes(period)
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersData = ordersRes.data as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const abandonedData = abandonedRes.data as any;

        setOrderData(ordersData);
        // peak times
        const peakMetrics = peakRes.data as PeakOrderTimes;
        type PeakBreakdown = { top10PeakTimes?: PeakOrderTimes['peakOrderTime'][] };
        const peakBreakdown = (peakRes.breakdown || {}) as PeakBreakdown;
        const rawTop = peakBreakdown.top10PeakTimes || [];
        const top10 = (rawTop as (PeakOrderTimes['peakOrderTime'] | null)[]).filter((x): x is NonNullable<PeakOrderTimes['peakOrderTime']> => x != null);

        setPeakData({
          totalDataPoints: peakMetrics.totalDataPoints || 0,
          peakOrderTime: peakMetrics.peakOrderTime || null,
          avgOrdersPerHour: peakMetrics.avgOrdersPerHour || 0,
          top10PeakTimes: top10
        });
        setAbandonedData({
          totalCarts: abandonedData.totalAbandonedCarts || abandonedData.totalCarts || 0,
          abandonedCarts: abandonedData.totalAbandonedCarts || abandonedData.abandonedCarts || 0,
          abandonedRate: abandonedData.abandonmentRate || abandonedData.abandonedRate || 0,
          recoveredCarts: abandonedData.recovered || abandonedData.recoveredCarts || 0,
          recoveryRate: abandonedData.recoveryRate || 0
        });

      } catch (error) {
        console.error('Error fetching order analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load order analytics",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Orders Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Prepare chart data with safe fallbacks
  const dayPartData = {
    labels: Object.keys(orderData.breakdown?.dayPart || {}),
    datasets: [{
      data: Object.values(orderData.breakdown?.dayPart || {}),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
      borderWidth: 1,
    }]
  };

  const orderTypeData = {
    labels: Object.keys(orderData.breakdown?.orderType || {}).map(type =>
      type === 'pickup' ? 'Pickup' : 'Delivery'
    ),
    datasets: [{
      label: 'Orders',
      data: Object.values(orderData.breakdown?.orderType || {}),
      backgroundColor: ['#4BC0C0', '#FF6384'],
      borderWidth: 1,
    }]
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Orders Analytics</h2>
        <DateRangeSelector period={period} onPeriodChange={(p) => setPeriod(p as TimePeriod)} />
      </div>

      {/* Key Order Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Orders"
          value={orderData.totalOrders || 0}
          subtitle={`${orderData.completedOrders || 0} completed`}
        />
        <MetricCard
          title="Completion Rate"
          value={`${(orderData.completionRate || 0).toFixed(1)}%`}
          subtitle="Orders completed vs started"
        />
        <MetricCard
          title="Average Order Value"
          value={`₹${(orderData.averageOrderValue || 0).toFixed(0)}`}
          subtitle="Revenue per order"
        />
        <MetricCard
          title="Basket Size"
          value={(orderData.basketSize || 0).toFixed(1)}
          subtitle="Average items per order"
        />
          <MetricCard
            title="First-time Orders"
            value={`${(orderData.firstTimeOrderRate || 0).toFixed(1)}%`}
            subtitle="% of orders by new customers"
          />
          <MetricCard
            title="Repeat Orders"
            value={`${(orderData.repeatOrderRate || 0).toFixed(1)}%`}
            subtitle="% of orders by returning customers"
          />
      </div>

      {/* Order Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Day Part Distribution</CardTitle>
            <CardDescription>Orders by time of day</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(orderData.breakdown?.dayPart || {}).length > 0 ? (
              <Doughnut
                key={`daypart-${period}`}
                data={dayPartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  animation: {
                    duration: 0
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Type Distribution</CardTitle>
            <CardDescription>Pickup vs Delivery orders</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(orderData.breakdown?.orderType || {}).length > 0 ? (
              <Bar
                key={`ordertype-${period}`}
                data={orderTypeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  animation: {
                    duration: 0
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      {/* Peak Order Times */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Order Times</CardTitle>
          <CardDescription>Hours and days with the highest order volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
            <MetricCard
              title="Peak Order Time"
              value={peakData.peakOrderTime ? `${peakData.peakOrderTime.dayOfWeek} @ ${peakData.peakOrderTime.hour}:00` : 'N/A'}
              subtitle={peakData.peakOrderTime ? `${peakData.peakOrderTime.orderCount} orders` : undefined}
            />
            <MetricCard
              title="Avg Orders / Hour"
              value={`${(peakData.avgOrdersPerHour || 0).toFixed(2)}`}
              subtitle="Average across heatmap cells"
            />
            <MetricCard
              title="Data Points"
              value={peakData.totalDataPoints || 0}
              subtitle="Day/hour cells"
            />
          </div>

          {/* <div>
            <h4 className="text-sm font-medium mb-2">Top Peak Times (by orders)</h4>
            {Array.isArray(peakData.top10PeakTimes) && peakData.top10PeakTimes.length > 0 ? (
              <div className="grid gap-2">
                {peakData.top10PeakTimes!.slice(0, 10).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{p.dayOfWeek} — {p.hour}:00</div>
                      <div className="text-xs text-muted-foreground">{p.dayPart} • {p.orderCount} orders • ₹{(p.totalRevenue || 0).toFixed(0)}</div>
                    </div>
                    <div className="text-sm font-medium">{p.orderCount}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No peak data available</div>
            )}
          </div> */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
          <CardDescription>Detailed order status distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{orderData.breakdown?.status?.completed || 0}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{orderData.breakdown?.status?.cancelled || 0}</div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{orderData.breakdown?.status?.pending || 0}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abandoned Cart Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Abandoned Cart Analytics</CardTitle>
          <CardDescription>Cart abandonment and recovery metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Carts"
              value={abandonedData.totalCarts || 0}
              subtitle="Carts created"
            />
            <MetricCard
              title="Abandoned Carts"
              value={abandonedData.abandonedCarts || 0}
              subtitle={`${(abandonedData.abandonedRate || 0).toFixed(1)}% abandonment rate`}
            />
            <MetricCard
              title="Recovered Carts"
              value={abandonedData.recoveredCarts || 0}
              subtitle="Carts recovered after abandonment"
            />
            <MetricCard
              title="Recovery Rate"
              value={`${(abandonedData.recoveryRate || 0).toFixed(1)}%`}
              subtitle="Abandoned carts recovered"
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Total Revenue</span>
              <span className="font-medium">₹{(orderData.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average Basket Value</span>
              <span className="font-medium">₹{((orderData.averageOrderValue || 0) * (orderData.basketSize || 0)).toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Orders per Day</span>
              <span className="font-medium">{((orderData.totalOrders || 0) / 30).toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Completion Rate</span>
              <span className={`font-medium ${(orderData.completionRate || 0) > 80 ? 'text-green-600' : 'text-red-600'}`}>
                {(orderData.completionRate || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Abandonment Rate</span>
              <span className={`font-medium ${(abandonedData.abandonedRate || 0) < 20 ? 'text-green-600' : 'text-red-600'}`}>
                {(abandonedData.abandonedRate || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Recovery Rate</span>
              <span className="font-medium">{(abandonedData.recoveryRate || 0).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
