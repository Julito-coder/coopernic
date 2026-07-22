
ALTER TABLE public.cotisation_plans ADD COLUMN IF NOT EXISTS duration_months INTEGER;
ALTER TABLE public.cotisation_subscriptions ADD COLUMN IF NOT EXISTS custom_amount_cents INTEGER;
