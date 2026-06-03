
-- pot_payments: block non-superadmin writes explicitly
CREATE POLICY "Only superadmin can insert payments"
  ON public.pot_payments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only superadmin can update payments"
  ON public.pot_payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only superadmin can delete payments"
  ON public.pot_payments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- user_roles: prevent privilege escalation
CREATE POLICY "Only superadmin can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only superadmin can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only superadmin can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));
