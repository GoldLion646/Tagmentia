
-- Reset promo code usage for user nohrabassem@yahoo.com
-- They have an active subscription with DOHA2025 that needs to be reset

-- Expire the current active subscription that's using the promo code
UPDATE public.user_subscriptions
SET status = 'expired',
    end_date = now(),
    updated_at = now()
WHERE user_id = '9acb12e5-50c6-404e-91bb-734005c1d1bf'
  AND id = '8f092c86-038f-4a8d-a145-abb4ec98ce73'
  AND status = 'active';

-- Decrement the current_uses counter for the DOHA2025 promo code
UPDATE public.promotions
SET current_uses = GREATEST(0, current_uses - 1),
    updated_at = now()
WHERE UPPER(code) = 'DOHA2025';
