"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Bar
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
const MetricCard = ({ title, value, subtitle }: {
  title: string;
  value: string | number;
  subtitle?: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default function ProductsAnalyticsPage() {
  const [productData, setProductData] = useState({
    topSelling: [] as Array<{
      productId: string;
      name: string;
      category: string;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
      averagePrice: number;
    }>,
    categoryPerformance: [] as Array<{
      category: string;
      totalRevenue: number;
      totalQuantity: number;
      orderCount: number;
      uniqueProductsCount: number;
      averageOrderValue: number;
    }>
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const { toast } = useToast();

  useEffect(() => {
    const fetchProductAnalytics = async () => {
      setLoading(true);
      try {
        const [topSellingRes, categoryRes] = await Promise.all([
          analytics.getTopSellingProducts(period, 10),
          analytics.getProductCategoryPerformance(period)
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topSellingData = topSellingRes.data as any || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categoryData = categoryRes.data as any || [];

        setProductData({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topSelling: topSellingData.map((item: any) => ({
            productId: item.productId || item._id,
            name: item.productName || item.name,
            category: item.category,
            totalQuantity: item.totalSold || item.totalQuantity || 0,
            totalRevenue: item.totalRevenue || 0,
            orderCount: item.orderCount || 0,
            averagePrice: item.avgPrice || item.averagePrice || 0,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categoryPerformance: categoryData.map((item: any) => ({
            category: item.category,
            totalRevenue: item.totalRevenue || 0,
            totalQuantity: item.totalSales || item.totalQuantity || 0,
            orderCount: item.orderCount || 0,
            uniqueProductsCount: item.itemCount || item.uniqueProductsCount || 0,
            averageOrderValue: item.avgOrderValue || item.averageOrderValue || 0,
          }))
        });

      } catch (error) {
        console.error('Error fetching product analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load product analytics",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProductAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Products Analytics</h2>
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
  const categoryRevenueData = {
    labels: productData.categoryPerformance.map(cat => cat.category),
    datasets: [{
      label: 'Revenue (₹)',
      data: productData.categoryPerformance.map(cat => cat.totalRevenue),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      borderWidth: 1,
    }]
  };

  const categoryQuantityData = {
    labels: productData.categoryPerformance.map(cat => cat.category),
    datasets: [{
      label: 'Quantity Sold',
      data: productData.categoryPerformance.map(cat => cat.totalQuantity),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      borderWidth: 1,
    }]
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Products Analytics</h2>
        <div className="flex items-center space-x-2">
          <DateRangeSelector period={period} onPeriodChange={(p) => setPeriod(p as TimePeriod)} />
        </div>
      </div>

      {/* Key Product Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Products Sold"
          value={productData.topSelling.length > 0 ? productData.topSelling.reduce((sum, product) => sum + product.totalQuantity, 0) : 0}
          subtitle="Across all categories"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${productData.topSelling.length > 0 ? productData.topSelling.reduce((sum, product) => sum + product.totalRevenue, 0).toLocaleString() : '0'}`}
          subtitle="From product sales"
        />
        <MetricCard
          title="Categories"
          value={productData.categoryPerformance.length}
          subtitle="Active categories"
        />
        <MetricCard
          title="Avg Product Price"
          value={`₹${productData.topSelling.length > 0 ?
            (productData.topSelling.reduce((sum, product) => sum + product.averagePrice, 0) / productData.topSelling.length).toFixed(0) :
            '0'}`}
          subtitle="Average selling price"
        />
      </div>

      {/* Top Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Best performing products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productData.topSelling.slice(0, 10).map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-medium text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-medium">₹{product.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{product.totalQuantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Revenue contribution by product category</CardDescription>
          </CardHeader>
          <CardContent>
            {productData.categoryPerformance.length > 0 ? (
              <Bar
                key={`revenue-${period}`}
                data={categoryRevenueData}
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
                      ticks: {
                        callback: function(value) {
                          return '₹' + (value as number).toLocaleString();
                        }
                      }
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
            <CardTitle>Quantity by Category</CardTitle>
            <CardDescription>Units sold by product category</CardDescription>
          </CardHeader>
          <CardContent>
            {productData.categoryPerformance.length > 0 ? (
              <Bar
                key={`quantity-${period}`}
                data={categoryQuantityData}
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

      {/* Category Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Performance Details</CardTitle>
          <CardDescription>Detailed breakdown by product category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productData.categoryPerformance.map((category) => (
              <div key={category.category} className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{category.category}</p>
                  <p className="text-sm text-muted-foreground">{category.uniqueProductsCount} products</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">₹{category.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{category.totalQuantity}</p>
                  <p className="text-sm text-muted-foreground">Units</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{category.orderCount}</p>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">₹{category.averageOrderValue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Avg Order</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Product Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Best Selling Product</span>
              <span className="font-medium text-right">
                {productData.topSelling[0]?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Top Category</span>
              <span className="font-medium">
                {productData.categoryPerformance[0]?.category || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Items/Order</span>
              <span className="font-medium">
                {productData.categoryPerformance.length > 0 ?
                  ((productData.categoryPerformance.reduce((sum, cat) => sum + cat.totalQuantity, 0) /
                   Math.max(1, productData.categoryPerformance.reduce((sum, cat) => sum + cat.orderCount, 0)))).toFixed(1) :
                  '0'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Highest Revenue Product</span>
              <span className="font-medium">
                ₹{productData.topSelling[0]?.totalRevenue.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Highest Revenue Category</span>
              <span className="font-medium">
                ₹{productData.categoryPerformance[0]?.totalRevenue.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Revenue Concentration</span>
              <span className="font-medium">
                {productData.topSelling.length >= 3 ?
                  ((productData.topSelling.slice(0, 3).reduce((sum, p) => sum + p.totalRevenue, 0) /
                    Math.max(1, productData.topSelling.reduce((sum, p) => sum + p.totalRevenue, 0))) * 100).toFixed(1) :
                  '0'}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Most Diverse Category</span>
              <span className="font-medium">
                {productData.categoryPerformance.length > 0 ?
                  productData.categoryPerformance.reduce((prev, current) =>
                    (prev.uniqueProductsCount > current.uniqueProductsCount) ? prev : current
                  )?.category || 'N/A'
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Highest Avg Order Value</span>
              <span className="font-medium">
                {productData.categoryPerformance.length > 0 ?
                  productData.categoryPerformance.reduce((prev, current) =>
                    (prev.averageOrderValue > current.averageOrderValue) ? prev : current
                  )?.category || 'N/A'
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Categories</span>
              <span className="font-medium">{productData.categoryPerformance.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
