
CREATE OR REPLACE FUNCTION public.current_user_club_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.club_id
  FROM public.members m
  JOIN auth.users u ON lower(u.email) = lower(m.email)
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_user_club_id() TO authenticated;

DROP POLICY IF EXISTS "Members see same club" ON public.members;
DROP POLICY IF EXISTS "Members see members of open-network clubs (reciprocity)" ON public.members;

CREATE POLICY "Members see same club"
ON public.members FOR SELECT
TO authenticated
USING (club_id IS NOT NULL AND club_id = public.current_user_club_id());

CREATE POLICY "Members see open-network clubs"
ON public.members FOR SELECT
TO authenticated
USING (
  club_id IN (SELECT id FROM public.clubs WHERE open_to_network = true)
  AND public.current_user_club_id() IN (SELECT id FROM public.clubs WHERE open_to_network = true)
);
