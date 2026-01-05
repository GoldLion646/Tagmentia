import { cn } from "@/lib/utils";
import { validatePassword } from "@/utils/inputSanitization";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);
  
  const checks = [
    { label: "At least 8 characters", test: password.length >= 8 },
    { label: "Contains uppercase letter", test: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", test: /[a-z]/.test(password) },
    { label: "Contains number", test: /\d/.test(password) },
    { label: "Contains special character", test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const passedChecks = checks.filter(check => check.test).length;
  const strength = passedChecks === 0 ? 0 : Math.round((passedChecks / checks.length) * 100);

  const getStrengthColor = () => {
    if (strength < 40) return "bg-red-500";
    if (strength < 60) return "bg-orange-500";
    if (strength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strength < 40) return "Weak";
    if (strength < 60) return "Fair";
    if (strength < 80) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password Strength</span>
        <span className={cn(
          "text-sm font-medium",
          strength < 40 ? "text-red-500" :
          strength < 60 ? "text-orange-500" :
          strength < 80 ? "text-yellow-500" :
          "text-green-500"
        )}>
          {getStrengthLabel()}
        </span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            getStrengthColor()
          )}
          style={{ width: `${strength}%` }}
        />
      </div>

      <div className="space-y-1">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center text-xs">
            <div
              className={cn(
                "w-2 h-2 rounded-full mr-2",
                check.test ? "bg-green-500" : "bg-muted"
              )}
            />
            <span
              className={cn(
                check.test ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}