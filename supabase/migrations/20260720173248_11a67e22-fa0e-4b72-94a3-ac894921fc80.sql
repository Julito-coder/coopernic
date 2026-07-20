
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location_name TEXT,
  location_address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  practical_info TEXT,
  poll_question TEXT,
  poll_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  poll_results_visible BOOLEAN NOT NULL DEFAULT true,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Helper: does the current user belong (by email) to a given club?
CREATE OR REPLACE FUNCTION public.is_member_of_club(_club_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    JOIN auth.users u ON lower(u.email) = lower(m.email)
    WHERE u.id = auth.uid() AND m.club_id = _club_id
  );
$$;

CREATE POLICY "View events of own club"
ON public.events FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR public.managed_club_id(auth.uid()) = club_id
  OR public.is_member_of_club(club_id)
);

CREATE POLICY "Manager creates events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
  OR public.managed_club_id(auth.uid()) = club_id
);

CREATE POLICY "Manager updates events"
ON public.events FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR public.managed_club_id(auth.uid()) = club_id
)
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
  OR public.managed_club_id(auth.uid()) = club_id
);

CREATE POLICY "Manager deletes events"
ON public.events FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR public.managed_club_id(auth.uid()) = club_id
);

CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_responses TO authenticated;
GRANT ALL ON public.event_responses TO service_role;

ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View responses per visibility"
ON public.event_responses FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'superadmin')
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_responses.event_id
      AND (
        public.managed_club_id(auth.uid()) = e.club_id
        OR (e.poll_results_visible = true AND public.is_member_of_club(e.club_id))
      )
  )
);

CREATE POLICY "Members insert own response"
ON public.event_responses FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_responses.event_id
      AND public.is_member_of_club(e.club_id)
  )
);

CREATE POLICY "Members update own response"
ON public.event_responses FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members delete own response"
ON public.event_responses FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));
