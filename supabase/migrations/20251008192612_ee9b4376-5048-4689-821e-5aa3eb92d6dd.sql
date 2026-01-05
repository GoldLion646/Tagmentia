
-- Reset promo code usage for user nohrabassem@yahoo.com
-- Clear the promo code from their expired subscription so they can reuse it

-- Clear the promo code from the expired subscription
UPDATE public.user_subscriptions
SET promo_code = NULL,
    updated_at = now()
WHERE user_id = '9acb12e5-50c6-404e-91bb-734005c1d1bf'
  AND id = '8f092c86-038f-4a8d-a145-abb4ec98ce73'
  AND promo_code = 'DOHA2025';

-- Decrement the current_uses counter for the DOHA2025 promo code
UPDATE public.promotions
SET current_uses = GREATEST(0, current_uses - 1),
    updated_at = now()
WHERE UPPER(code) = 'DOHA2025';
