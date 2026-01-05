
-- Reset promo code usage for user nohrabassem@yahoo.com
-- User ID: 9acb12e5-50c6-404e-91bb-734005c1d1bf
-- They have a cancelled subscription with promo code DOHA2025

-- First, decrement the current_uses counter for the DOHA2025 promo code
UPDATE public.promotions
SET current_uses = GREATEST(0, current_uses - 1),
    updated_at = now()
WHERE UPPER(code) = 'DOHA2025';

-- Clear the promo code from the cancelled subscription so the user can use it again
UPDATE public.user_subscriptions
SET promo_code = NULL,
    updated_at = now()
WHERE user_id = '9acb12e5-50c6-404e-91bb-734005c1d1bf'
  AND promo_code = 'DOHA2025'
  AND status = 'cancelled';
