-- Secure branding settings and add audit triggers

-- Ensure RLS is enabled on branding_settings
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Create a generic audit trigger function for table changes
CREATE OR REPLACE FUNCTION public.audit_generic_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_security_event(
    'table_change',
    auth.uid(),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) - 'created_at' - 'updated_at' ELSE NULL END,
      'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) - 'created_at' - 'updated_at' ELSE NULL END
    ),
    CASE WHEN TG_OP = 'DELETE' THEN 'high' ELSE 'medium' END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_branding_settings_changes ON public.branding_settings;
CREATE TRIGGER audit_branding_settings_changes
AFTER INSERT OR UPDATE OR DELETE ON public.branding_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

DROP TRIGGER IF EXISTS audit_plans_changes ON public.plans;
CREATE TRIGGER audit_plans_changes
AFTER INSERT OR UPDATE OR DELETE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.audit_generic_changes();

-- Also audit subscription changes using the existing function
DROP TRIGGER IF EXISTS audit_user_subscriptions ON public.user_subscriptions;
CREATE TRIGGER audit_user_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_changes();
