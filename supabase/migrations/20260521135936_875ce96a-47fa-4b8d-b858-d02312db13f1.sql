
-- POTS
CREATE TABLE public.pots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  goal_cents INTEGER NOT NULL CHECK (goal_cents > 0),
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pots_club ON public.pots(club_id);

ALTER TABLE public.pots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manages all pots" ON public.pots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'))
  WITH CHECK (has_role(auth.uid(),'superadmin'));

CREATE POLICY "Gestionnaire manages pots of their club" ON public.pots
  FOR ALL TO authenticated
  USING (club_id = managed_club_id(auth.uid()))
  WITH CHECK (club_id = managed_club_id(auth.uid()));

CREATE POLICY "Members see pots of their club" ON public.pots
  FOR SELECT TO authenticated
  USING (club_id = (SELECT club_id FROM public.members WHERE id = auth.uid()));

CREATE TRIGGER pots_updated_at BEFORE UPDATE ON public.pots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- POT_PARTICIPANTS
CREATE TABLE public.pot_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pot_id UUID NOT NULL REFERENCES public.pots(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pot_id, member_id)
);
CREATE INDEX idx_pot_participants_pot ON public.pot_participants(pot_id);

ALTER TABLE public.pot_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manages all participants" ON public.pot_participants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'))
  WITH CHECK (has_role(auth.uid(),'superadmin'));

CREATE POLICY "Gestionnaire sees participants of their club pots" ON public.pot_participants
  FOR SELECT TO authenticated
  USING (pot_id IN (SELECT id FROM public.pots WHERE club_id = managed_club_id(auth.uid())));

CREATE POLICY "Members see participants of their club pots" ON public.pot_participants
  FOR SELECT TO authenticated
  USING (pot_id IN (SELECT id FROM public.pots WHERE club_id = (SELECT club_id FROM public.members WHERE id = auth.uid())));

CREATE POLICY "Members join a pot themselves" ON public.pot_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND pot_id IN (
      SELECT id FROM public.pots
      WHERE status = 'open'
        AND club_id = (SELECT club_id FROM public.members WHERE id = auth.uid())
    )
  );

CREATE POLICY "Members leave a pot themselves" ON public.pot_participants
  FOR DELETE TO authenticated
  USING (member_id = auth.uid());

-- POT_PAYMENTS
CREATE TABLE public.pot_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pot_id UUID NOT NULL REFERENCES public.pots(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pot_id, member_id)
);
CREATE INDEX idx_pot_payments_pot ON public.pot_payments(pot_id);
CREATE INDEX idx_pot_payments_session ON public.pot_payments(stripe_session_id);

ALTER TABLE public.pot_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manages all payments" ON public.pot_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'))
  WITH CHECK (has_role(auth.uid(),'superadmin'));

CREATE POLICY "Gestionnaire sees payments of their club pots" ON public.pot_payments
  FOR SELECT TO authenticated
  USING (pot_id IN (SELECT id FROM public.pots WHERE club_id = managed_club_id(auth.uid())));

CREATE POLICY "Members see their own payments" ON public.pot_payments
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

CREATE TRIGGER pot_payments_updated_at BEFORE UPDATE ON public.pot_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
