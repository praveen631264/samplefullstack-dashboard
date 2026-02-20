import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Package, UserPlus, AlertTriangle } from "lucide-react";
import type { Activity } from "@shared/schema";

const typeConfig: Record<string, { icon: typeof ShoppingCart; color: string; label: string }> = {
  order: { icon: ShoppingCart, color: "text-blue-500", label: "Order" },
  product: { icon: Package, color: "text-emerald-500", label: "Product" },
  customer: { icon: UserPlus, color: "text-purple-500", label: "Customer" },
  alert: { icon: AlertTriangle, color: "text-amber-500", label: "Alert" },
};

function formatDate(date: string | Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-activity">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all recent system activities and events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activities?.map((activity) => {
                const config = typeConfig[activity.type] || typeConfig.alert;
                const Icon = config.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                    data-testid={`activity-log-item-${activity.id}`}
                  >
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activity.entityName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
