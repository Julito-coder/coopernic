
-- 1) Events: recurrence (RRULE)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rrule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS events_recurrence_parent_idx ON public.events(recurrence_parent_id);

-- 2) Per-user module permissions (used by the "Responsable" role: any member the gestionnaire grants module access to)
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_id, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_module_permissions TO authenticated;
GRANT ALL ON public.user_module_permissions TO service_role;

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own module perms"
  ON public.user_module_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "superadmin or club gestionnaire manages module perms"
  ON public.user_module_permissions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = user_module_permissions.club_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = user_module_permissions.club_id
    )
  );

-- 3) Cotisations
CREATE TABLE IF NOT EXISTS public.cotisation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  interval text NOT NULL CHECK (interval IN ('monthly','quarterly','yearly')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotisation_plans TO authenticated;
GRANT ALL ON public.cotisation_plans TO service_role;

ALTER TABLE public.cotisation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members and managers read club plans"
  ON public.cotisation_plans FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.club_id = cotisation_plans.club_id
    )
    OR public.is_member_of_club(cotisation_plans.club_id)
  );

CREATE POLICY "managers manage club plans"
  ON public.cotisation_plans FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_plans.club_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_plans.club_id
    )
  );

CREATE TRIGGER cotisation_plans_updated_at
  BEFORE UPDATE ON public.cotisation_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cotisation_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.cotisation_plans(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','overdue','cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_due_at timestamptz,
  last_reminder_step integer NOT NULL DEFAULT 0,
  last_reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotisation_subscriptions TO authenticated;
GRANT ALL ON public.cotisation_subscriptions TO service_role;

ALTER TABLE public.cotisation_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own subscriptions"
  ON public.cotisation_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "managers read club subscriptions"
  ON public.cotisation_subscriptions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_subscriptions.club_id
    )
  );

CREATE POLICY "managers manage club subscriptions"
  ON public.cotisation_subscriptions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_subscriptions.club_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_subscriptions.club_id
    )
  );

CREATE TRIGGER cotisation_subscriptions_updated_at
  BEFORE UPDATE ON public.cotisation_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cotisation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.cotisation_subscriptions(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  stripe_session_id text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotisation_payments TO authenticated;
GRANT ALL ON public.cotisation_payments TO service_role;

ALTER TABLE public.cotisation_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own cotisation payments"
  ON public.cotisation_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "managers read club cotisation payments"
  ON public.cotisation_payments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_payments.club_id
    )
  );

CREATE TRIGGER cotisation_payments_updated_at
  BEFORE UPDATE ON public.cotisation_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Backfill: add 'cotisations' to existing clubs default module list
UPDATE public.clubs
SET modules = array_append(modules, 'cotisations')
WHERE NOT ('cotisations' = ANY(COALESCE(modules, ARRAY[]::text[])));
