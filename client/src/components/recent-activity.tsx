import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Package, UserPlus, AlertTriangle } from "lucide-react";
import type { Activity } from "@shared/schema";

interface RecentActivityProps {
  activities: Activity[];
  isLoading: boolean;
}

const typeConfig: Record<string, { icon: typeof ShoppingCart; color: string; label: string }> = {
  order: { icon: ShoppingCart, color: "text-blue-500", label: "Order" },
  product: { icon: Package, color: "text-emerald-500", label: "Product" },
  customer: { icon: UserPlus, color: "text-purple-500", label: "Customer" },
  alert: { icon: AlertTriangle, color: "text-amber-500", label: "Alert" },
};

function formatTimeAgo(date: string | Date | null) {
  if (!date) return "just now";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-recent-activity">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-recent-activity">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-3">
          <div className="space-y-3">
            {activities.map((activity) => {
              const config = typeConfig[activity.type] || typeConfig.alert;
              const Icon = config.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-md p-2 transition-colors"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{activity.description}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
