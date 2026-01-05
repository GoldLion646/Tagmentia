-- CRITICAL SECURITY FIX: Restrict plans table access to prevent business intelligence exposure

-- Drop the overly permissive policy that allows any authenticated user to see all plan details
DROP POLICY IF EXISTS "Authenticated users can view enabled plans" ON public.plans;

-- Create a more restrictive policy - only admins can directly access plans table
CREATE POLICY "Only admins can view plans table" 
ON public.plans 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- The existing get_public_pricing() and get_public_plans() functions already provide secure access to necessary pricing data
-- These functions only expose safe display information, not sensitive business data like Stripe IDs

-- Add security logging for plans table modifications (not SELECT as it doesn't support triggers)
CREATE OR REPLACE FUNCTION public.log_plans_modifications()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_security_event(
    'sensitive_data_modification',
    auth.uid(),
    jsonb_build_object(
      'table', 'plans',
      'operation', TG_OP,
      'plan_id', COALESCE(NEW.id, OLD.id),
      'plan_name', COALESCE(NEW.name, OLD.name),
      'admin_access', has_role(auth.uid(), 'admin'::app_role)
    ),
    'high'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger to monitor plans table modifications
CREATE TRIGGER log_plans_modifications_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.log_plans_modifications();

-- Add comments to document the secure functions
COMMENT ON FUNCTION public.get_public_pricing() IS 'Secure public access to pricing data. Only exposes safe display information: id, name, price_monthly, price_yearly, display_features. Does NOT expose Stripe IDs.';

COMMENT ON FUNCTION public.get_public_plans() IS 'Secure public access to plan details for authenticated users. Used for subscription management. Still does not expose sensitive Stripe configuration.';