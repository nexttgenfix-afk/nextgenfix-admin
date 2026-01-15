"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
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
} from "chart.js";
import { useToast } from "@/hooks/use-toast";
import { DateRangeSelector } from "@/components/date-range-selector";
import * as analytics from "@/lib/api/analytics";
import type { TimePeriod } from "@/lib/api/analytics";

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
const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { type: string; value: string };
  icon?: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {trend && (
        <p
          className={`text-xs ${
            trend.type === "positive" ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.value}
        </p>
      )}
    </CardContent>
  </Card>
);

export default function RevenueAnalyticsPage() {
  const [revenueData, setRevenueData] = useState<{
    gmv: number;
    netRevenue: number;
    totalDiscounts: number;
    refunds: number;
    avgDiscountPerOrder: number;
    breakdown?: {
      byOrderType?: Record<string, number>;
      byPaymentMode?: Record<string, number>;
    };
  }>({
    gmv: 0,
    netRevenue: 0,
    totalDiscounts: 0,
    refunds: 0,
    avgDiscountPerOrder: 0,
    breakdown: {
      byOrderType: {},
      byPaymentMode: {},
    },
  });

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const { toast } = useToast();

  useEffect(() => {
    const fetchRevenueAnalytics = async () => {
      setLoading(true);
      try {
        const response = await analytics.getRevenueOverview(period);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = response.data as any || {};
        setRevenueData({
          gmv: data.gmv || data.totalRevenue || 0,
          netRevenue: data.netRevenue || 0,
          totalDiscounts: data.totalDiscounts || 0,
          refunds: data.refunds || data.totalRefunds || 0,
          avgDiscountPerOrder: data.avgDiscountPerOrder || 0,
          breakdown: {
            byOrderType: data.breakdown?.byOrderType || {},
            byPaymentMode: data.breakdown?.byPaymentMode || {},
          },
        });
      } catch (error) {
        console.error("Error fetching revenue analytics:", error);
        toast({
          title: "Error",
          description: "Failed to load revenue analytics",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Revenue Analytics</h2>
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

  // Prepare chart data
  const orderTypeRevenueData = {
    labels: Object.keys(revenueData.breakdown?.byOrderType || {}).map((type) =>
      type === "pickup" ? "Pickup" : "Delivery"
    ),
    datasets: [
      {
        label: "Revenue (₹)",
        data: Object.values(revenueData.breakdown?.byOrderType || {}),
        backgroundColor: ["#4BC0C0", "#FF6384"],
        borderWidth: 1,
      },
    ],
  };

  const paymentModeData = {
    labels: Object.keys(revenueData.breakdown?.byPaymentMode || {}).map(
      (mode) => mode.charAt(0).toUpperCase() + mode.slice(1)
    ),
    datasets: [
      {
        data: Object.values(revenueData.breakdown?.byPaymentMode || {}),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
        borderWidth: 1,
      },
    ],
  };

  const revenueBreakdownData = {
    labels: ["Net Revenue", "Discounts", "Refunds"],
    datasets: [
      {
        label: "Amount (₹)",
        data: [
          revenueData.netRevenue || 0,
          revenueData.totalDiscounts || 0,
          revenueData.refunds || 0,
        ],
        backgroundColor: ["#4BC0C0", "#FF6384", "#FFCE56"],
        borderWidth: 1,
      },
    ],
  };

  const commonBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (tickValue: string | number) =>
            "₹" + Number(tickValue).toLocaleString(),
        },
      },
    },
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Revenue Analytics</h2>
        <DateRangeSelector period={period} onPeriodChange={(p) => setPeriod(p as TimePeriod)} />
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Gross Merchandise Value"
          value={`₹${(revenueData.gmv || 0).toLocaleString()}`}
          subtitle="Total order value"
        />
        <MetricCard
          title="Net Revenue"
          value={`₹${(revenueData.netRevenue || 0).toLocaleString()}`}
          subtitle="After discounts & refunds"
        />
        <MetricCard
          title="Total Discounts"
          value={`₹${(revenueData.totalDiscounts || 0).toLocaleString()}`}
          subtitle="Discounts given"
        />
        <MetricCard
          title="Average Discount/Order"
          value={`₹${(revenueData.avgDiscountPerOrder || 0).toFixed(0)}`}
          subtitle="Per order discount"
        />
      </div>

      {/* Revenue Breakdown Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Order Type</CardTitle>
            <CardDescription>Pickup vs Delivery revenue</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {Object.keys(revenueData.breakdown?.byOrderType || {}).length > 0 ? (
              <Bar data={orderTypeRevenueData} options={commonBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method Distribution</CardTitle>
            <CardDescription>Revenue by payment mode</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {Object.keys(revenueData.breakdown?.byPaymentMode || {}).length > 0 ? (
              <Pie
                data={paymentModeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 0 },
                  plugins: { legend: { position: "bottom" } },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Components Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Components</CardTitle>
          <CardDescription>Breakdown of GMV into components</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <Bar data={revenueBreakdownData} options={commonBarOptions} />
        </CardContent>
      </Card>

      {/* Revenue Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">GMV to Net Revenue Ratio</span>
              <span className="font-medium">
                {(revenueData.gmv || 0) > 0
                  ? (
                      ((revenueData.netRevenue || 0) / (revenueData.gmv || 1)) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Discount Percentage</span>
              <span className="font-medium">
                {(revenueData.gmv || 0) > 0
                  ? (
                      ((revenueData.totalDiscounts || 0) /
                        (revenueData.gmv || 1)) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Refund Rate</span>
              <span className="font-medium">
                {(revenueData.gmv || 0) > 0
                  ? (
                      ((revenueData.refunds || 0) / (revenueData.gmv || 1)) *
                      100
                    ).toFixed(2)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(revenueData.breakdown?.byPaymentMode || {}).map(
              ([mode, amount]) => (
                <div key={mode} className="flex justify-between">
                  <span className="text-sm capitalize">{mode}</span>
                  <span className="font-medium">
                    ₹{(amount || 0).toLocaleString()}
                  </span>
                </div>
              )
            )}
            {Object.keys(revenueData.breakdown?.byPaymentMode || {}).length ===
              0 && (
              <div className="text-sm text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Type Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(revenueData.breakdown?.byOrderType || {}).map(
              ([type, amount]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-sm capitalize">{type}</span>
                  <span className="font-medium">
                    ₹{(amount || 0).toLocaleString()}
                  </span>
                </div>
              )
            )}
            {Object.keys(revenueData.breakdown?.byOrderType || {}).length ===
              0 && (
              <div className="text-sm text-muted-foreground">
                No order type data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary</CardTitle>
          <CardDescription>Key takeaways from revenue analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Strengths</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Net Revenue: ₹{(revenueData.netRevenue || 0).toLocaleString()}
                </li>
                <li>
                  • Low refund rate:{" "}
                  {(revenueData.gmv || 0) > 0
                    ? (
                        ((revenueData.refunds || 0) / (revenueData.gmv || 1)) *
                        100
                      ).toFixed(2)
                    : 0}
                  %
                </li>
                <li>• Diverse payment methods available</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Opportunities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Discount cost: ₹
                  {(revenueData.totalDiscounts || 0).toLocaleString()}
                </li>
                <li>• Consider optimizing discount strategies</li>
                <li>• Monitor payment method preferences</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

