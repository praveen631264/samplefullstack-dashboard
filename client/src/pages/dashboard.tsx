import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { RevenueChart } from "@/components/revenue-chart";
import { OrdersChart } from "@/components/orders-chart";
import { RecentActivity } from "@/components/recent-activity";
import { TopProducts } from "@/components/top-products";
import type { DashboardMetrics, RevenueByMonth, OrdersByStatus, TopProduct, Activity } from "@shared/schema";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueByMonth[]>({
    queryKey: ["/api/dashboard/revenue"],
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersByStatus[]>({
    queryKey: ["/api/dashboard/orders-by-status"],
  });

  const { data: topProducts, isLoading: productsLoading } = useQuery<TopProduct[]>({
    queryKey: ["/api/dashboard/top-products"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here's an overview of your application data.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={metricsLoading ? "..." : `${(metrics?.totalRevenue ?? 0).toLocaleString()}`}
          change={metrics?.revenueChange ?? 0}
          icon={DollarSign}
          prefix="$"
        />
        <StatsCard
          title="Total Orders"
          value={metricsLoading ? "..." : `${metrics?.totalOrders ?? 0}`}
          change={metrics?.ordersChange ?? 0}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Total Products"
          value={metricsLoading ? "..." : `${metrics?.totalProducts ?? 0}`}
          change={metrics?.productsChange ?? 0}
          icon={Package}
        />
        <StatsCard
          title="Active Customers"
          value={metricsLoading ? "..." : `${metrics?.activeCustomers ?? 0}`}
          change={metrics?.customersChange ?? 0}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <RevenueChart data={revenueData ?? []} isLoading={revenueLoading} />
        <OrdersChart data={ordersData ?? []} isLoading={ordersLoading} />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopProducts products={topProducts ?? []} isLoading={productsLoading} />
        </div>
        <RecentActivity activities={activities ?? []} isLoading={activitiesLoading} />
      </div>
    </div>
  );
}
