"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
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
  BarElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Small defensive helper
const safeNumber = (v?: number | null) => (v ?? 0);

const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
}: {
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
        <div className={`text-xs mt-2 ${trend.type === "positive" ? "text-green-600" : "text-red-600"}`}>
          {trend.value}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function UsersAnalyticsPage() {
  const [userData, setUserData] = useState<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    newVsReturning: { new: number; returning: number };
    breakdown?: {
      gender?: Record<string, number>;
      ageGroup?: Record<string, number>;
      deviceType?: Record<string, number>;
      loginMethod?: Record<string, number>;
    };
  }>({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    newVsReturning: { new: 0, returning: 0 },
    breakdown: {
      gender: {},
      ageGroup: {},
      deviceType: {},
      loginMethod: {},
    },
  });

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const { toast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const fetchUserAnalytics = async () => {
      setLoading(true);
      try {
        const response = await analytics.getUserOverview(period);

        // defensive: ensure the shape is stable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = response.data as any ?? {};
        setUserData({
          totalUsers: safeNumber(data.totalUsers),
          activeUsers: safeNumber(data.activeUsers),
          newUsers: safeNumber(data.newUsers),
          newVsReturning: {
            new: safeNumber(data.newVsReturning?.new || data.newUsers),
            returning: safeNumber(data.newVsReturning?.returning || data.returningUsers),
          },
          breakdown: {
            gender: data.breakdown?.gender ?? {},
            ageGroup: data.breakdown?.ageGroup ?? {},
            deviceType: data.breakdown?.deviceType ?? {},
            loginMethod: data.breakdown?.loginMethod ?? {},
          },
        });
      } catch (err) {
        console.error("Error fetching user analytics:", err);
        toast({
          title: "Error",
          description: "Failed to load user analytics",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAnalytics();
    return () => controller.abort();
    // intentionally only depend on period to avoid repeated fetches
    // toast is stable in typical implementations and kept out of deps to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Chart common options: responsive and stable sizing
  const chartOptionsCommon = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 as number },
    plugins: {
      legend: {
        labels: { boxWidth: 12, boxHeight: 8 },
      },
      title: { display: false },
    },
  };

  // Chart data memoization prevents unnecessary object recreation
  const genderData = useMemo(() => {
    const gender = userData.breakdown?.gender ?? {};
    const labels = Object.keys(gender).map((g) => (g === "Prefer not to say" ? "Not Specified" : g));
    const values = Object.values(gender).map((v) => safeNumber(v));
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
          borderWidth: 1,
        },
      ],
    };
  }, [userData.breakdown]);

  const ageGroupData = useMemo(() => {
    const ag = userData.breakdown?.ageGroup ?? {};
    const labels = Object.keys(ag);
    const values = Object.values(ag).map((v) => safeNumber(v));
    return {
      labels,
      datasets: [
        {
          label: "Users",
          data: values,
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
          borderWidth: 1,
        },
      ],
    };
  }, [userData.breakdown]);

  const deviceTypeData = useMemo(() => {
    const dt = userData.breakdown?.deviceType ?? {};
    const labels = Object.keys(dt).map((d) => (d === "Unknown" ? "Not Specified" : d));
    const values = Object.values(dt).map((v) => safeNumber(v));
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
          borderWidth: 1,
        },
      ],
    };
  }, [userData.breakdown]);

  const loginMethodData = useMemo(() => {
    const lm = userData.breakdown?.loginMethod ?? {};
    const labels = Object.keys(lm).map((m) => (m === "OTP" ? "Phone/OTP" : m));
    const values = Object.values(lm).map((v) => safeNumber(v));
    return {
      labels,
      datasets: [
        {
          label: "Users",
          data: values,
          backgroundColor: ["#4BC0C0", "#FF6384", "#36A2EB", "#FFCE56"],
          borderWidth: 1,
        },
      ],
    };
  }, [userData.breakdown]);

  const newVsReturningData = useMemo(() => {
    const n = safeNumber(userData.newVsReturning?.new);
    const r = safeNumber(userData.newVsReturning?.returning);
    return {
      labels: ["New Users", "Returning Users"],
      datasets: [
        {
          data: [n, r],
          backgroundColor: ["#4BC0C0", "#FF6384"],
          borderWidth: 1,
        },
      ],
    };
  }, [userData.newVsReturning]);

  // Helpers for primary device/login picks
  const pickTopKey = (obj?: Record<string, number>) => {
    if (!obj || Object.keys(obj).length === 0) return "N/A";
    return Object.entries(obj).reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
  };

  // Responsive wrapper classes to keep charts adaptive but consistent
  // h-56 mobile, md:h-64, lg:h-72
  const chartWrapperClass = "h-56 md:h-64 lg:h-72";

  if (loading) {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Users Analytics</h2>
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

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users Analytics</h2>
        <DateRangeSelector period={period} onPeriodChange={(p) => setPeriod(p as TimePeriod)} />
      </div>

      {/* Key User Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Users" value={userData.totalUsers || 0} subtitle="Registered users" />
        <MetricCard title="Active Users" value={userData.activeUsers || 0} subtitle="Users active this period" />
        <MetricCard title="New Users" value={userData.newUsers || 0} subtitle="New registrations" />
        <MetricCard
          title="New vs Returning"
          value={`${userData.newVsReturning?.new || 0}/${userData.newVsReturning?.returning || 0}`}
          subtitle="New/Returning ratio"
        />
      </div>

      {/* Demographics row (two responsive columns) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>User gender breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={chartWrapperClass}>
              {Object.keys(userData.breakdown?.gender || {}).length > 0 ? (
                <Pie
                  key={`gender-${period}`}
                  data={genderData}
                  options={{
                    ...chartOptionsCommon,
                    plugins: { ...chartOptionsCommon.plugins, legend: { position: "bottom" } },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Age Group Distribution</CardTitle>
            <CardDescription>Users by age groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={chartWrapperClass}>
              {Object.keys(userData.breakdown?.ageGroup || {}).length > 0 ? (
                <Bar
                  key={`agegroup-${period}`}
                  data={ageGroupData}
                  options={{
                    ...chartOptionsCommon,
                    plugins: { ...chartOptionsCommon.plugins, legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device and Login Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device Type Usage</CardTitle>
            <CardDescription>How users access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={chartWrapperClass}>
              {Object.keys(userData.breakdown?.deviceType || {}).length > 0 ? (
                <Doughnut
                  key={`device-${period}`}
                  data={deviceTypeData}
                  options={{
                    ...chartOptionsCommon,
                    plugins: { ...chartOptionsCommon.plugins, legend: { position: "bottom" } },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login Method Preferences</CardTitle>
            <CardDescription>Authentication methods used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={chartWrapperClass}>
              {Object.keys(userData.breakdown?.loginMethod || {}).length > 0 ? (
                <Bar
                  key={`login-${period}`}
                  data={loginMethodData}
                  options={{
                    ...chartOptionsCommon,
                    plugins: { ...chartOptionsCommon.plugins, legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New vs Returning Users */}
      <Card>
        <CardHeader>
          <CardTitle>New vs Returning Users</CardTitle>
          <CardDescription>User acquisition and retention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 items-start">
            <div className={chartWrapperClass}>
              <Pie
                key={`returning-${period}`}
                data={newVsReturningData}
                options={{
                  ...chartOptionsCommon,
                  plugins: { ...chartOptionsCommon.plugins, legend: { position: "bottom" } },
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-medium">New Users</p>
                  <p className="text-sm text-muted-foreground">First-time users</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{userData.newVsReturning?.new || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {(userData.activeUsers || 0) > 0
                      ? (((userData.newVsReturning?.new || 0) / (userData.activeUsers || 1)) * 100).toFixed(1)
                      : "0.0"}
                    % of active
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Returning Users</p>
                  <p className="text-sm text-muted-foreground">Repeat customers</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{userData.newVsReturning?.returning || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {(userData.activeUsers || 0) > 0
                      ? (((userData.newVsReturning?.returning || 0) / (userData.activeUsers || 1)) * 100).toFixed(1)
                      : "0.0"}
                    % of active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Active User Rate</span>
              <span className="font-medium">
                {(userData.totalUsers || 0) > 0
                  ? (((userData.activeUsers || 0) / (userData.totalUsers || 1)) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">New User Rate</span>
              <span className="font-medium">
                {(userData.activeUsers || 0) > 0
                  ? (((userData.newUsers || 0) / (userData.activeUsers || 1)) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Retention Rate</span>
              <span className="font-medium">
                {(userData.activeUsers || 0) > 0
                  ? (((userData.newVsReturning?.returning || 0) / (userData.activeUsers || 1)) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Most Popular Device</p>
              <p className="text-lg">{pickTopKey(userData.breakdown?.deviceType)}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Preferred Login</p>
              <p className="text-lg">{pickTopKey(userData.breakdown?.loginMethod)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demographics Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Primary Age Group</p>
              <p className="text-lg">{pickTopKey(userData.breakdown?.ageGroup)}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Gender Distribution</p>
              <p className="text-sm text-muted-foreground">
                {Object.keys(userData.breakdown?.gender || {}).length} categories tracked
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


