-- Enable the Gold Plan so it can be used with promotions
UPDATE public.plans 
SET enabled = true, updated_at = now()
WHERE id = 'ac0e82e9-1e6e-4108-8f30-2a1c597ffaf5' AND name = 'Gold Plan';