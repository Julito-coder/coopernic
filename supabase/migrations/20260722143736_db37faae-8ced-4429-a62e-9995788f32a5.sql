-- Allow members to subscribe to an active cotisation plan in their own club
CREATE POLICY "members create own cotisation subscriptions"
  ON public.cotisation_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.cotisation_plans cp
      WHERE cp.id = cotisation_subscriptions.plan_id
        AND cp.club_id = cotisation_subscriptions.club_id
        AND cp.active = true
    )
    AND public.is_member_of_club(cotisation_subscriptions.club_id)
  );

-- Let delegated module responsables manage cotisation plans for their club
CREATE POLICY "module responsables manage cotisation plans"
  ON public.cotisation_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = auth.uid()
        AND ump.club_id = cotisation_plans.club_id
        AND ump.module = 'cotisations'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = auth.uid()
        AND ump.club_id = cotisation_plans.club_id
        AND ump.module = 'cotisations'
    )
  );

-- Let delegated module responsables read and manage cotisation subscriptions for their club
CREATE POLICY "module responsables manage cotisation subscriptions"
  ON public.cotisation_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = auth.uid()
        AND ump.club_id = cotisation_subscriptions.club_id
        AND ump.module = 'cotisations'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = auth.uid()
        AND ump.club_id = cotisation_subscriptions.club_id
        AND ump.module = 'cotisations'
    )
  );

-- Let gestionnaires and delegated responsables record cotisation payments
CREATE POLICY "managers manage club cotisation payments"
  ON public.cotisation_payments
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_payments.club_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = auth.uid()
        AND ump.club_id = cotisation_payments.club_id
        AND ump.module = 'cotisations'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'gestionnaire'
        AND ur.club_id = cotisation_payments.club_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = auth.uid()
        AND ump.club_id = cotisation_payments.club_id
        AND ump.module = 'cotisations'
    )
  );