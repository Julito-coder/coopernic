
DROP POLICY IF EXISTS "Manager creates events" ON public.events;
CREATE POLICY "Members create events in own club" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR public.managed_club_id(auth.uid()) = club_id
    OR public.is_member_of_club(club_id)
  );
