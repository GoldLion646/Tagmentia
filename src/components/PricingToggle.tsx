import { useState } from "react";

interface PricingToggleProps {
  onToggle: (isYearly: boolean) => void;
}

export const PricingToggle = ({ onToggle }: PricingToggleProps) => {
  const [isYearly, setIsYearly] = useState(false);

  const handleToggle = () => {
    const newValue = !isYearly;
    setIsYearly(newValue);
    onToggle(newValue);
  };

  return (
    <div className="flex items-center justify-center gap-3 mb-12">
      <span className={`text-lg font-medium transition-colors ${!isYearly ? 'text-primary' : 'text-muted-foreground'}`}>
        Monthly
      </span>
      <button
        onClick={handleToggle}
        className="relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        style={{ backgroundColor: isYearly ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
        aria-label="Toggle between monthly and yearly pricing"
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            isYearly ? 'translate-x-9' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-lg font-medium transition-colors ${isYearly ? 'text-primary' : 'text-muted-foreground'}`}>
        Yearly
        <span className="ml-2 text-sm text-green-600 font-semibold">Save 17%</span>
      </span>
    </div>
  );
};
