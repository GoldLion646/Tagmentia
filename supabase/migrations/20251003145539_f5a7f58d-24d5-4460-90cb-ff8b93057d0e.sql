-- Update validate_promo_code to use case-insensitive comparison
CREATE OR REPLACE FUNCTION public.validate_promo_code(promo_code_input text)
 RETURNS TABLE(valid boolean, message text, plan_id uuid, plan_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  promo_record RECORD;
  plan_record RECORD;
  user_usage_count integer;
BEGIN
  -- Check if promotion exists and is active (case-insensitive)
  SELECT * INTO promo_record
  FROM public.promotions
  WHERE UPPER(code) = UPPER(promo_code_input) AND status = 'active';
  
  IF promo_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired promo code'::text, null::uuid, ''::text;
    RETURN;
  END IF;
  
  -- Check if promotion has reached max uses
  IF promo_record.max_uses > 0 AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum usage limit'::text, null::uuid, ''::text;
    RETURN;
  END IF;
  
  -- Check if user has already used this promo code (if single_use_per_user is true)
  IF promo_record.single_use_per_user AND auth.uid() IS NOT NULL THEN
    SELECT COUNT(*) INTO user_usage_count
    FROM public.user_subscriptions
    WHERE user_id = auth.uid() AND UPPER(promo_code) = UPPER(promo_code_input);
    
    IF user_usage_count > 0 THEN
      RETURN QUERY SELECT false, 'You have already used this promo code'::text, null::uuid, ''::text;
      RETURN;
    END IF;
  END IF;
  
  -- Get plan details
  SELECT * INTO plan_record
  FROM public.plans
  WHERE id = promo_record.plan_id AND enabled = true;
  
  IF plan_record IS NULL THEN
    RETURN QUERY SELECT false, 'Associated plan is not available'::text, null::uuid, ''::text;
    RETURN;
  END IF;
  
  -- Return valid promotion details
  RETURN QUERY SELECT true, 'Promo code is valid'::text, plan_record.id, plan_record.name;
END;
$function$;

-- Update activate_promotion to use case-insensitive comparison
CREATE OR REPLACE FUNCTION public.activate_promotion(promo_code_input text, user_uuid uuid)
 RETURNS TABLE(success boolean, message text, plan_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  promo_record RECORD;
  plan_record RECORD;
  end_date_calculated TIMESTAMPTZ;
BEGIN
  -- Find promotion by case-insensitive code match
  SELECT * INTO promo_record
  FROM public.promotions
  WHERE UPPER(code) = UPPER(promo_code_input) AND status = 'active';
  
  IF promo_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired promo code', ''::TEXT;
    RETURN;
  END IF;
  
  SELECT * INTO plan_record
  FROM public.plans
  WHERE id = promo_record.plan_id AND enabled = true;
  
  IF plan_record IS NULL THEN
    RETURN QUERY SELECT false, 'Associated plan is not available', ''::TEXT;
    RETURN;
  END IF;
  
  end_date_calculated := now() + (promo_record.validity_days || ' days')::INTERVAL;
  
  UPDATE public.user_subscriptions 
  SET status = 'expired', updated_at = now()
  WHERE user_id = user_uuid AND status = 'active';
  
  INSERT INTO public.user_subscriptions (
    user_id, plan_id, start_date, end_date, promo_code, status
  ) VALUES (
    user_uuid, promo_record.plan_id, now(), end_date_calculated, promo_record.code, 'active'
  );
  
  -- Increment usage count
  UPDATE public.promotions
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = promo_record.id;
  
  RETURN QUERY SELECT true, 'Promotion activated successfully', plan_record.name;
END;
$function$;