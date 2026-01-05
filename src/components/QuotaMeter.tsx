import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";

interface QuotaMeterProps {
  current: number;
  max: number;
  isUnlimited?: boolean;
}

export const QuotaMeter = ({ current, max, isUnlimited }: QuotaMeterProps) => {
  if (isUnlimited) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Screenshots:</span>
        <Badge variant="outline" className="font-mono">
          {current} / ∞
        </Badge>
      </div>
    );
  }

  const percentage = (current / max) * 100;
  const isNearLimit = percentage > 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Screenshots</span>
        </div>
        <Badge 
          variant={isNearLimit ? "destructive" : "outline"}
          className="font-mono"
        >
          {current} / {max}
        </Badge>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};
