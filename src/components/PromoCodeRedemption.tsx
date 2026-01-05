import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PromoCodeRedemptionProps {
  onSuccess?: () => void;
}

export const PromoCodeRedemption = ({ onSuccess }: PromoCodeRedemptionProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    plan_name?: string;
    plan_id?: string;
  } | null>(null);
  const { toast } = useToast();

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        promo_code_input: promoCode.trim().toUpperCase()
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setValidationResult(result);
        
        if (result.valid) {
          toast({
            title: "Valid Promo Code!",
            description: `Ready to upgrade to ${result.plan_name}`,
          });
        } else {
          toast({
            title: "Invalid Promo Code",
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate promo code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const redeemPromoCode = async () => {
    if (!validationResult?.valid || !validationResult.plan_id) {
      toast({
        title: "Cannot Redeem",
        description: "Please validate the promo code first",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('activate_promotion', {
        promo_code_input: promoCode.trim().toUpperCase(),
        user_uuid: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        
        if (result.success) {
          toast({
            title: "Promo Code Redeemed!",
            description: `Successfully upgraded to ${result.plan_name}`,
          });
          
          // Reset form
          setPromoCode("");
          setValidationResult(null);
          
          // Call success callback
          onSuccess?.();
        } else {
          toast({
            title: "Redemption Failed",
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Error redeeming promo code:', error);
      toast({
        title: "Redemption Error",
        description: error.message || "Failed to redeem promo code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Redeem Promo Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="promo-code">Enter Promo Code</Label>
          <div className="flex gap-2">
            <Input
              id="promo-code"
              type="password"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setValidationResult(null);
              }}
              placeholder="Enter your promo code"
              className="flex-1"
              maxLength={20}
            />
            <Button
              onClick={validatePromoCode}
              disabled={isValidating || !promoCode.trim()}
              variant="outline"
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Validate"
              )}
            </Button>
          </div>
        </div>

        {validationResult && (
          <div className={`p-3 rounded-lg border ${
            validationResult.valid 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {validationResult.valid ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-medium ${
                validationResult.valid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {validationResult.valid ? 'Valid Promo Code' : 'Invalid Promo Code'}
              </span>
            </div>
            
            <p className={`text-sm ${
              validationResult.valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            }`}>
              {validationResult.message}
            </p>
            
            {validationResult.valid && validationResult.plan_name && (
              <div className="mt-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Upgrade to {validationResult.plan_name}
                </Badge>
              </div>
            )}
          </div>
        )}

        {validationResult?.valid && (
          <Button
            onClick={redeemPromoCode}
            disabled={isRedeeming}
            className="w-full"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redeeming...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Redeem Promo Code
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Promo codes are case-insensitive</p>
          <p>• Each promo code can only be used once per user</p>
          <p>• Promo codes have limited validity periods</p>
        </div>
      </CardContent>
    </Card>
  );
};