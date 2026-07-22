
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS modules text[] NOT NULL
  DEFAULT ARRAY['annuaire','messages','evenements','cagnottes','carte','recos','stats'];

-- Allow the club's gestionnaire to update their own club (modules, etc.)
DROP POLICY IF EXISTS "Gestionnaire updates own club" ON public.clubs;
CREATE POLICY "Gestionnaire updates own club" ON public.clubs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR gestionnaire_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR gestionnaire_id = auth.uid());

-- Allow a gestionnaire (without a club yet) to insert their own club
DROP POLICY IF EXISTS "Gestionnaire creates own club" ON public.clubs;
CREATE POLICY "Gestionnaire creates own club" ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR (public.has_role(auth.uid(), 'gestionnaire') AND gestionnaire_id = auth.uid())
  );
