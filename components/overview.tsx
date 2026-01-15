
"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "@/lib/api";

interface ChartDataPoint {
  name: string;
  users: number;
  orders: number;
  chefs: number;
  issues: number;
}

export function Overview() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        const trends = res.data.trends;
        // Map API trends to recharts data format
        const data: ChartDataPoint[] = trends.months.map((month: string, i: number) => ({
          name: month,
          users: trends.users[i] ?? 0,
          orders: trends.orders[i] ?? 0,
          chefs: trends.chefs[i] ?? 0,
          issues: trends.issues[i] ?? 0,
        }));
        setChartData(data);
      } catch (err) {
        let message = "Failed to load dashboard stats.";
        if (err && typeof err === "object") {
          if (err instanceof Error) message = err.message;
          else if (typeof (err as { message?: unknown }).message === "string") message = (err as { message: string }).message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-[350px]">Loading chart...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-[350px] text-red-500">{error}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} name="Users" />
        <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} name="Orders" />
        <Line type="monotone" dataKey="chefs" stroke="#ffc658" strokeWidth={2} activeDot={{ r: 8 }} name="Chefs" />
        <Line type="monotone" dataKey="issues" stroke="#ff4d4f" strokeWidth={2} activeDot={{ r: 8 }} name="Issues" />
      </LineChart>
    </ResponsiveContainer>
  );
}


