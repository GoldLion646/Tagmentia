import { Button } from '@/components/ui/button';
import { Monitor, Smartphone } from 'lucide-react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { cn } from '@/lib/utils';

export function LayoutToggle() {
  const { layoutType, setPreferredLayout, preferredLayout } = useDeviceDetection();

  const handleToggle = () => {
    const newLayout = layoutType === 'mobile' ? 'web' : 'mobile';
    setPreferredLayout(newLayout);
  };

  const handleReset = () => {
    setPreferredLayout(null);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2",
          preferredLayout && "border-primary"
        )}
      >
        {layoutType === 'mobile' ? (
          <>
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile View</span>
          </>
        ) : (
          <>
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Web View</span>
          </>
        )}
      </Button>
      {preferredLayout && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs"
        >
          Auto
        </Button>
      )}
    </div>
  );
}
