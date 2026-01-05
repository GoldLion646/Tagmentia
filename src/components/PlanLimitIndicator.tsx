import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, FolderOpen, PlayCircle, Brain } from "lucide-react";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";

export const PlanLimitIndicator = () => {
  const { limits, loading, isFreePlan, isPremiumPlan, isGoldPlan } = useSubscriptionLimits();

  if (loading || !limits) return null;

  const categoryUsagePercent = limits.max_categories === -1 ? 0 : 
    (limits.current_categories / limits.max_categories) * 100;

  const getPlanColor = () => {
    if (isGoldPlan) return "text-yellow-600";
    if (isPremiumPlan) return "text-blue-600";
    return "text-gray-600";
  };

  const getPlanIcon = () => {
    if (isGoldPlan) return <Crown className="w-4 h-4" />;
    if (isPremiumPlan) return <Crown className="w-4 h-4" />;
    return <FolderOpen className="w-4 h-4" />;
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {getPlanIcon()}
            <span className={`font-medium ${getPlanColor()}`}>
              {limits.plan_name}
            </span>
          </div>
          {isGoldPlan && (
            <Badge className="bg-yellow-100 text-yellow-800">
              Premium Features
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          {/* Categories Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Categories</span>
            </div>
            <div className="text-right">
              {limits.max_categories === -1 ? (
                <span className="text-sm text-green-600 font-medium">Unlimited</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {limits.current_categories} / {limits.max_categories}
                </span>
              )}
            </div>
          </div>

          {limits.max_categories !== -1 && (
            <Progress 
              value={categoryUsagePercent} 
              className="h-2"
            />
          )}

          {/* Videos per Category */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Videos per Category</span>
            </div>
            <div className="text-right">
              {limits.max_videos_per_category === -1 ? (
                <span className="text-sm text-green-600 font-medium">Unlimited</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Up to {limits.max_videos_per_category}
                </span>
              )}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};