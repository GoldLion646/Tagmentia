import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HardDrive, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StorageQuotaMeterProps {
  used_mb: number;
  quota_mb: number | null;
  percentage: number | null;
  is_unlimited: boolean;
}

export const StorageQuotaMeter = ({ 
  used_mb, 
  quota_mb, 
  percentage, 
  is_unlimited 
}: StorageQuotaMeterProps) => {
  if (is_unlimited) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <HardDrive className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Storage:</span>
        <Badge variant="outline" className="font-mono">
          {used_mb} MB / ∞
        </Badge>
      </div>
    );
  }

  const isNearLimit = percentage !== null && percentage > 80;
  const isOverLimit = percentage !== null && percentage >= 100;

  return (
    <div className="space-y-2">
      {isOverLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You've reached your storage limit. Delete older screenshots or upgrade your plan.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Storage Used</span>
        </div>
        <Badge 
          variant={isOverLimit ? "destructive" : isNearLimit ? "default" : "outline"}
          className="font-mono"
        >
          {used_mb} MB / {quota_mb} MB
        </Badge>
      </div>
      <Progress value={Math.min(percentage || 0, 100)} className="h-2" />
      {isNearLimit && !isOverLimit && (
        <p className="text-xs text-amber-600">
          You're approaching your storage limit. Consider upgrading your plan.
        </p>
      )}
    </div>
  );
};