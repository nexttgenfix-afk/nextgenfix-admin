"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from '@/lib/api';
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  Line
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
// shared axios instance `api` is used (imported above)
import { useToast } from "@/hooks/use-toast";
import { DateRangeSelector } from "@/components/date-range-selector";

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

// API base is configured in `lib/axios.ts` via NEXT_PUBLIC_API_BASE_URL

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

export default function AdvancedAnalyticsPage() {
  const [ltvData, setLtvData] = useState({
    averageLTV: 0,
    totalLTV: 0,
    ltvBySegment: [] as Array<{ segment: string, ltv: number, customerCount: number }>,
    ltvDistribution: [] as Array<{ range: string, count: number }>
  });

  const [genderTrendsData, setGenderTrendsData] = useState({
    genderItemMatrix: [] as Array<{
      gender: string;
      items: Array<{ itemName: string; orderCount: number; revenue: number }>;
    }>,
    dayPartPreferences: [] as Array<{
      gender: string;
      breakfast: number;
      lunch: number;
      dinner: number;
    }>
  });

  const [highValueCustomersData, setHighValueCustomersData] = useState({
    topCustomers: [] as Array<{
      customerId: string;
      name: string;
      totalSpent: number;
      orderCount: number;
      avgOrderValue: number;
      lastOrderDate: string;
    }>,
    paretoData: [] as Array<{ customer: string; cumulativeRevenue: number; percentage: number }>
    ,
    // newly added metrics populated from backend
    top10Share: 0,
    top20Share: 0,
    avgRevenuePerCustomer: 0
  });

  const [timeToSecondOrderData, setTimeToSecondOrderData] = useState({
    averageTime: 0,
    distribution: [] as Array<{ range: string; count: number; percentage: number }>,
    conversionRate: 0
  });

  const [subscriptionData, setSubscriptionData] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    subscriptionRevenue: 0,
    churnRate: 0,
    subscriptionTrend: [] as Array<{ date: string; subscriptions: number; churns: number }>
  });

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const { toast } = useToast();

  useEffect(() => {
    const fetchAdvancedAnalytics = async () => {
        try {
          // Use shared axios instance `api` which attaches token from localStorage automatically
          const [
            ltvResponse,
            genderTrendsResponse,
            highValueResponse,
            timeToSecondResponse
          ] = await Promise.all([
            api.get(`/admin/analytics/advanced/ltv?period=${period}`),
            api.get(`/admin/analytics/advanced/gender-trends?period=${period}`),
            api.get(`/admin/analytics/advanced/high-value-customers?period=${period}`),
            api.get(`/admin/analytics/advanced/time-to-second-order?period=${period}`)
          ]);

        // Map LTV response to expected state shape
        const ltvApiData = ltvResponse.data.data || {};
        const ltvBreakdown = ltvResponse.data.breakdown || {};
        setLtvData({
          averageLTV: ltvApiData.avgLTV || 0,
          totalLTV: (ltvApiData.avgLTV || 0) * (ltvApiData.totalCustomers || 0),
          ltvBySegment: (ltvBreakdown.byTier || []).map((t: { tier: string; avgLTV: number; customers: number }) => ({
            segment: t.tier || 'Unknown',
            ltv: t.avgLTV || 0,
            customerCount: t.customers || 0
          })),
          ltvDistribution: ltvApiData.ltvDistribution || []
        });

        // Gender trends data already has the right shape
        setGenderTrendsData({
          genderItemMatrix: genderTrendsResponse.data.data?.genderItemMatrix || [],
          dayPartPreferences: genderTrendsResponse.data.data?.dayPartPreferences || []
        });

        // Map high-value customers response (metrics in data, topCustomers in breakdown)
        const hvData = highValueResponse.data.data || {};
        const hvBreakdown = highValueResponse.data.breakdown || {};
        setHighValueCustomersData({
          topCustomers: (hvBreakdown.topCustomers || []).map((c: { userId: string; name: string; totalRevenue: number; orderCount: number; avgOrderValue: number }) => ({
            customerId: c.userId,
            name: c.name || 'Unknown',
            totalSpent: c.totalRevenue || 0,
            orderCount: c.orderCount || 0,
            avgOrderValue: c.avgOrderValue || 0,
            lastOrderDate: ''
          })),
          paretoData: [],
          top10Share: hvData.top10Share || 0,
          top20Share: hvData.top20Share || 0,
          avgRevenuePerCustomer: hvData.avgRevenuePerCustomer || 0
        });

        // Map time-to-second-order: distribution is an object in breakdown, needs to be an array
        const t2Data = timeToSecondResponse.data.data || {};
        const t2Breakdown = timeToSecondResponse.data.breakdown || {};
        const t2DistObj: Record<string, number> = t2Breakdown.distribution || {};
        const t2PctObj: Record<string, number> = t2Breakdown.distributionPercentage || {};
        setTimeToSecondOrderData({
          averageTime: t2Data.avgDaysToSecondOrder || 0,
          distribution: Object.entries(t2DistObj).map(([range, count]) => ({
            range,
            count: count as number,
            percentage: t2PctObj[range] || 0
          })),
          conversionRate: 0
        });
        // Fetch subscription analytics (if backend supports it)
        try {
          const subsResponse = await api.get(`/admin/analytics/advanced/subscriptions?period=${period}`);
          const subs = subsResponse.data.data || {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            subscriptionRevenue: 0,
            churnRate: 0
          };

          setSubscriptionData({
            totalSubscriptions: subs.totalSubscriptions || 0,
            activeSubscriptions: subs.activeSubscriptions || 0,
            subscriptionRevenue: subs.subscriptionRevenue || 0,
            churnRate: subs.churnRate || 0,
            subscriptionTrend: (subsResponse.data.breakdown && subsResponse.data.breakdown.subscriptionTrend) || []
          });
        } catch (e) {
          // If subscription API not available, keep zeros and let UI show empty trend
          const errMsg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : String(e);
          console.warn('Subscription analytics not available:', errMsg || e);
        }

      } catch (error) {
        console.error('Error fetching advanced analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load advanced analytics",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAdvancedAnalytics();
  }, [period, toast]);

  // Memoized charts
  const ltvDistributionChart = useMemo(() => ({
    labels: ltvData.ltvDistribution.map(item => item.range),
    datasets: [{
      label: 'Customers',
      data: ltvData.ltvDistribution.map(item => item.count),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  }), [ltvData]);

  const paretoChart = useMemo(() => ({
    labels: highValueCustomersData.paretoData.map(item => item.customer),
    datasets: [{
      label: 'Cumulative Revenue %',
      data: highValueCustomersData.paretoData.map(item => item.percentage),
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  }), [highValueCustomersData]);

  const timeToSecondOrderChart = useMemo(() => ({
    labels: timeToSecondOrderData.distribution.map(item => item.range),
    datasets: [{
      label: 'Customers',
      data: timeToSecondOrderData.distribution.map(item => item.count),
      backgroundColor: 'rgba(168, 85, 247, 0.8)',
      borderColor: 'rgba(168, 85, 247, 1)',
      borderWidth: 1,
    }],
  }), [timeToSecondOrderData]);

  const subscriptionTrendChart = useMemo(() => ({
    labels: subscriptionData.subscriptionTrend.map(item => item.date),
    datasets: [
      {
        label: 'New Subscriptions',
        data: subscriptionData.subscriptionTrend.map(item => item.subscriptions),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Churns',
        data: subscriptionData.subscriptionTrend.map(item => item.churns),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      }
    ],
  }), [subscriptionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading advanced analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">Deep insights into customer behavior, lifetime value, and predictive analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangeSelector period={period} onPeriodChange={setPeriod} />
        </div>
      </div>

      {/* Customer Lifetime Value Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Customer Lifetime Value (LTV)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Average LTV" value={`$${ltvData.averageLTV.toFixed(2)}`} subtitle="Per customer" />
          <MetricCard title="Total LTV" value={`$${ltvData.totalLTV.toLocaleString()}`} subtitle="Across all customers" />
          <MetricCard title="Top 20% LTV" value={`$${ltvData.ltvBySegment.find(s => s.segment === 'Top 20%')?.ltv.toFixed(2) || '0.00'}`} subtitle="High-value segment" />
          <MetricCard title="LTV Growth" value="+12.5%" subtitle="vs last period" trend={{ type: 'positive', value: '+12.5%' }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>LTV Distribution</CardTitle>
              <CardDescription>Customer lifetime value ranges</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              <Bar
                key={`ltv-${period}`}
                data={ltvDistributionChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LTV by Customer Segment</CardTitle>
              <CardDescription>Average LTV across different customer groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ltvData.ltvBySegment.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{segment.segment}</p>
                      <p className="text-sm text-muted-foreground">{segment.customerCount} customers</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${segment.ltv.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* High-Value Customers Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">High-Value Customers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Top 10% Revenue Share" value={`${highValueCustomersData.top10Share || 0}%`} subtitle="% of revenue from top 10% users" />
          <MetricCard title="Top 20% Revenue Share" value={`${highValueCustomersData.top20Share || 0}%`} subtitle="% of revenue from top 20% users" />
          <MetricCard title="Avg Revenue / Customer" value={`$${highValueCustomersData.avgRevenuePerCustomer ? highValueCustomersData.avgRevenuePerCustomer.toFixed(2) : '0.00'}`} subtitle="Average revenue per customer" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pareto Analysis (80/20 Rule)</CardTitle>
              <CardDescription>Revenue concentration among top customers</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              <Line
                key={`pareto-${period}`}
                data={paretoChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } }
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Customers</CardTitle>
              <CardDescription>Highest spending customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {highValueCustomersData.topCustomers.slice(0, 10).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.orderCount} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${customer.totalSpent.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Avg: ${customer.avgOrderValue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Time to Second Order Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Time to Second Order</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Average Time" value={`${Math.round(timeToSecondOrderData.averageTime)} days`} subtitle="To second purchase" />
          <MetricCard title="Conversion Rate" value={`${timeToSecondOrderData.conversionRate}%`} subtitle="First to repeat customers" />
          <MetricCard title="Fast Repeaters" value={`${timeToSecondOrderData.distribution.find(d => d.range === '< 7 days')?.percentage || 0}%`} subtitle="Within 1 week" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Time Distribution</CardTitle>
            <CardDescription>Days between first and second orders</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            <Bar
              key={`time-${period}`}
              data={timeToSecondOrderChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Subscription & Predictive Analytics Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Subscription & Predictive Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Subscriptions" value={subscriptionData.totalSubscriptions.toLocaleString()} subtitle="All time" />
          <MetricCard title="Active Subscriptions" value={subscriptionData.activeSubscriptions.toLocaleString()} subtitle="Currently active" />
          <MetricCard title="Subscription Revenue" value={`$${subscriptionData.subscriptionRevenue.toLocaleString()}`} subtitle="Monthly recurring" />
          <MetricCard title="Churn Rate" value={`${subscriptionData.churnRate}%`} subtitle="Monthly churn" trend={{ type: 'negative', value: '+2.1%' }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Trends</CardTitle>
            <CardDescription>New subscriptions vs churn over time</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            <Line
              key={`subscription-${period}`}
              data={subscriptionTrendChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Gender Trends Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Gender-Based Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {genderTrendsData.dayPartPreferences.map((genderData, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{genderData.gender} Day Part Preferences</CardTitle>
                <CardDescription>Order distribution by time of day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Breakfast</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(genderData.breakfast / (genderData.breakfast + genderData.lunch + genderData.dinner)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{genderData.breakfast}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lunch</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(genderData.lunch / (genderData.breakfast + genderData.lunch + genderData.dinner)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{genderData.lunch}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Dinner</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${(genderData.dinner / (genderData.breakfast + genderData.lunch + genderData.dinner)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{genderData.dinner}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
