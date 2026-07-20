-- ============================================================================
-- Feature "Évènements" (batches 3.1 CRUD, 3.2 inscriptions/liste d'attente,
-- 3.3 check-in QR).
--
-- NOTE d'intégration : le repo possède déjà une table `events` (feature
-- "évènement + sondage"). Pour faire coexister les deux features sans collision,
-- cette migration nomme ses objets avec le préfixe `club_event*`. La logique,
-- les policies RLS et les triggers restent ceux décrits dans la brief.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table principale : club_events
-- ----------------------------------------------------------------------------
CREATE TABLE public.club_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  format TEXT NOT NULL DEFAULT 'in_person'
    CHECK (format IN ('in_person', 'online', 'hybrid')),
  location_name TEXT,
  location_address TEXT,
  online_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled')),
  recurrence_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_events_club ON public.club_events(club_id);
CREATE INDEX idx_club_events_starts_at ON public.club_events(starts_at);
CREATE INDEX idx_club_events_recurrence ON public.club_events(recurrence_group_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT ALL ON public.club_events TO service_role;

ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER club_events_updated_at BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Members only see PUBLISHED events of their club ; managers/superadmin see all.
CREATE POLICY "View club events" ON public.club_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR public.managed_club_id(auth.uid()) = club_id
    OR (status = 'published' AND public.is_member_of_club(club_id))
  );

CREATE POLICY "Manager creates club events" ON public.club_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR public.managed_club_id(auth.uid()) = club_id
  );

CREATE POLICY "Manager updates club events" ON public.club_events
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR public.managed_club_id(auth.uid()) = club_id
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR public.managed_club_id(auth.uid()) = club_id
  );

CREATE POLICY "Manager deletes club events" ON public.club_events
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR public.managed_club_id(auth.uid()) = club_id
  );

-- ----------------------------------------------------------------------------
-- Inscriptions : club_event_registrations
--   member_id NULL  => invité externe (sans compte), saisi par le gestionnaire
--   status: registered | waitlist | cancelled
--   checked_in_at : présence, verrouillé par trigger anti-fraude
-- ----------------------------------------------------------------------------
CREATE TABLE public.club_event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'waitlist', 'cancelled')),
  checked_in_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- un membre ne peut pas s'inscrire deux fois ; un invité doit avoir un nom
  CONSTRAINT registration_identity CHECK (
    (member_id IS NOT NULL) OR (guest_name IS NOT NULL AND length(trim(guest_name)) > 0)
  )
);

-- un membre = une inscription par évènement (les invités ne sont pas contraints)
CREATE UNIQUE INDEX uq_club_event_reg_member
  ON public.club_event_registrations(event_id, member_id)
  WHERE member_id IS NOT NULL;
CREATE INDEX idx_club_event_reg_event ON public.club_event_registrations(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_event_registrations TO authenticated;
GRANT ALL ON public.club_event_registrations TO service_role;

ALTER TABLE public.club_event_registrations ENABLE ROW LEVEL SECURITY;

-- Helper : le user gère-t-il le club de cet évènement ?
CREATE OR REPLACE FUNCTION public.manages_event_club(_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_events e
    WHERE e.id = _event_id
      AND (
        public.has_role(auth.uid(), 'superadmin')
        OR public.managed_club_id(auth.uid()) = e.club_id
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.manages_event_club(uuid) FROM PUBLIC, anon, authenticated;

-- SELECT : sa propre inscription, ou le gestionnaire du club de l'évènement.
CREATE POLICY "View registrations" ON public.club_event_registrations
  FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR public.manages_event_club(event_id)
  );

-- INSERT : un membre s'inscrit lui-même à un évènement publié de son club ;
--          le gestionnaire inscrit qui il veut (membres, invités externes).
CREATE POLICY "Member self-registers" ON public.club_event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      member_id = auth.uid()
      AND created_by = auth.uid()
      AND checked_in_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.club_events e
        WHERE e.id = event_id
          AND e.status = 'published'
          AND public.is_member_of_club(e.club_id)
      )
    )
    OR public.manages_event_club(event_id)
  );

-- UPDATE : le membre peut modifier sa propre inscription (checked_in_at reste
--          verrouillé par le trigger anti-fraude) ; le gestionnaire gère tout.
CREATE POLICY "Update registrations" ON public.club_event_registrations
  FOR UPDATE TO authenticated
  USING (member_id = auth.uid() OR public.manages_event_club(event_id))
  WITH CHECK (member_id = auth.uid() OR public.manages_event_club(event_id));

-- DELETE : le membre se désinscrit lui-même ; le gestionnaire retire qui il veut.
CREATE POLICY "Delete registrations" ON public.club_event_registrations
  FOR DELETE TO authenticated
  USING (member_id = auth.uid() OR public.manages_event_club(event_id));

-- ----------------------------------------------------------------------------
-- Trigger anti-fraude : checked_in_at ne peut être posé/modifié que via les
-- fonctions SECURITY DEFINER (self_checkin / club_event_set_checkin), qui
-- positionnent le flag de session `app.checkin_ok`. Toute écriture directe de
-- checked_in_at via l'API (membre malveillant) est rejetée.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_checkin_at()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.checked_in_at IS NOT NULL
       AND current_setting('app.checkin_ok', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'checked_in_at is managed by the check-in flow';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
       AND current_setting('app.checkin_ok', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'checked_in_at is locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lock_checkin_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_lock_checkin_at
  BEFORE INSERT OR UPDATE ON public.club_event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.lock_checkin_at();

-- ----------------------------------------------------------------------------
-- Liste d'attente : à l'inscription, si la capacité est atteinte, la nouvelle
-- inscription passe automatiquement en 'waitlist'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_event_apply_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cap INTEGER;
  taken INTEGER;
BEGIN
  IF NEW.status <> 'registered' THEN
    RETURN NEW;
  END IF;

  SELECT capacity INTO cap FROM public.club_events WHERE id = NEW.event_id;

  IF cap IS NULL THEN
    RETURN NEW; -- capacité illimitée
  END IF;

  SELECT count(*) INTO taken
  FROM public.club_event_registrations
  WHERE event_id = NEW.event_id AND status = 'registered';

  IF taken >= cap THEN
    NEW.status := 'waitlist';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.club_event_apply_waitlist() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_club_event_apply_waitlist
  BEFORE INSERT ON public.club_event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.club_event_apply_waitlist();

-- ----------------------------------------------------------------------------
-- Promotion automatique : lorsqu'une place 'registered' se libère (désinscription
-- ou passage en 'cancelled'), on promeut le plus ancien inscrit en 'waitlist'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_event_promote_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ev_id UUID;
  cap INTEGER;
  taken INTEGER;
  next_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'registered' THEN
      RETURN OLD;
    END IF;
    ev_id := OLD.event_id;
  ELSE -- UPDATE : une place se libère si on quitte l'état 'registered'
    IF NOT (OLD.status = 'registered' AND NEW.status <> 'registered') THEN
      RETURN NEW;
    END IF;
    ev_id := OLD.event_id;
  END IF;

  -- L'évènement peut avoir été supprimé (cascade) : on s'arrête alors.
  SELECT capacity INTO cap FROM public.club_events WHERE id = ev_id;
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF cap IS NOT NULL THEN
    SELECT count(*) INTO taken
    FROM public.club_event_registrations
    WHERE event_id = ev_id AND status = 'registered';

    IF taken < cap THEN
      SELECT id INTO next_id
      FROM public.club_event_registrations
      WHERE event_id = ev_id AND status = 'waitlist'
      ORDER BY registered_at ASC
      LIMIT 1;

      IF next_id IS NOT NULL THEN
        UPDATE public.club_event_registrations
        SET status = 'registered'
        WHERE id = next_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.club_event_promote_waitlist() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_club_event_promote_waitlist
  AFTER UPDATE OR DELETE ON public.club_event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.club_event_promote_waitlist();

-- ----------------------------------------------------------------------------
-- Compteurs agrégés (inscrits / liste d'attente / présents) par évènement.
-- SECURITY DEFINER : la RLS ne laisse au membre voir que SA propre inscription,
-- donc les totaux passent par cette fonction (garde d'appartenance au club, sans
-- exposer la liste nominative ni les emails des invités).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_event_counts_for_club(_club_id uuid)
RETURNS TABLE (event_id uuid, registered integer, waitlist integer, checked_in integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.event_id,
         count(*) FILTER (WHERE r.status = 'registered')::int,
         count(*) FILTER (WHERE r.status = 'waitlist')::int,
         count(*) FILTER (WHERE r.status = 'registered' AND r.checked_in_at IS NOT NULL)::int
  FROM public.club_event_registrations r
  JOIN public.club_events e ON e.id = r.event_id
  WHERE e.club_id = _club_id
    AND (
      public.has_role(auth.uid(), 'superadmin')
      OR public.managed_club_id(auth.uid()) = _club_id
      OR public.is_member_of_club(_club_id)
    )
  GROUP BY r.event_id;
$$;

GRANT EXECUTE ON FUNCTION public.club_event_counts_for_club(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- Token de check-in : table dédiée, ILLISIBLE par les membres.
-- Un seul token secret par évènement (rotation possible par le gestionnaire).
-- ----------------------------------------------------------------------------
CREATE TABLE public.club_event_checkin_tokens (
  event_id UUID NOT NULL PRIMARY KEY REFERENCES public.club_events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE
    DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_event_checkin_tokens TO authenticated;
GRANT ALL ON public.club_event_checkin_tokens TO service_role;

ALTER TABLE public.club_event_checkin_tokens ENABLE ROW LEVEL SECURITY;

-- SEULS les gestionnaires du club (et superadmin) accèdent au token.
-- Aucune policy pour les membres : le token leur est totalement illisible.
CREATE POLICY "Manager reads checkin token" ON public.club_event_checkin_tokens
  FOR SELECT TO authenticated
  USING (public.manages_event_club(event_id));

CREATE POLICY "Manager writes checkin token" ON public.club_event_checkin_tokens
  FOR ALL TO authenticated
  USING (public.manages_event_club(event_id))
  WITH CHECK (public.manages_event_club(event_id));

-- ----------------------------------------------------------------------------
-- self_checkin : le membre scanne le QR (URL contient le token) et pointe
-- lui-même sa présence. SECURITY DEFINER : valide le token (illisible sinon),
-- vérifie la fenêtre de validité (-3h avant le début -> fin +1h), et pose
-- checked_in_at via le flag anti-fraude.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.self_checkin(_event_id uuid, _token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ev public.club_events%ROWTYPE;
  reg public.club_event_registrations%ROWTYPE;
  valid_token BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO ev FROM public.club_events WHERE id = _event_id;
  IF NOT FOUND OR ev.status <> 'published' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_available');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.club_event_checkin_tokens t
    WHERE t.event_id = _event_id AND t.token = _token
  ) INTO valid_token;
  IF NOT valid_token THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- Fenêtre de validité : de starts_at - 3h à (ends_at | starts_at) + 1h.
  IF now() < ev.starts_at - INTERVAL '3 hours'
     OR now() > COALESCE(ev.ends_at, ev.starts_at) + INTERVAL '1 hour' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outside_window');
  END IF;

  SELECT * INTO reg
  FROM public.club_event_registrations
  WHERE event_id = _event_id AND member_id = auth.uid();

  IF NOT FOUND THEN
    -- Inscription à la volée réservée aux membres du club (l'organisateur a le
    -- QR sur place) ; un utilisateur d'un autre club ne peut pas s'auto-inscrire.
    IF NOT public.is_member_of_club(ev.club_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_registered');
    END IF;
    PERFORM set_config('app.checkin_ok', '1', true);
    INSERT INTO public.club_event_registrations
      (event_id, member_id, status, checked_in_at, created_by)
    VALUES (_event_id, auth.uid(), 'registered', now(), auth.uid())
    RETURNING * INTO reg;
    PERFORM set_config('app.checkin_ok', '0', true);
    RETURN jsonb_build_object('ok', true, 'already', false, 'registration_id', reg.id);
  END IF;

  IF reg.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'registration_id', reg.id);
  END IF;

  PERFORM set_config('app.checkin_ok', '1', true);
  UPDATE public.club_event_registrations
  SET checked_in_at = now()
  WHERE id = reg.id;
  PERFORM set_config('app.checkin_ok', '0', true);

  RETURN jsonb_build_object('ok', true, 'already', false, 'registration_id', reg.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.self_checkin(uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- club_event_set_checkin : pointage/dé-pointage MANUEL par le gestionnaire
-- depuis la page organisateur. SECURITY DEFINER pour franchir le verrou
-- anti-fraude, après vérification que l'appelant gère bien le club.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_event_set_checkin(_registration_id uuid, _present boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reg public.club_event_registrations%ROWTYPE;
BEGIN
  SELECT * INTO reg FROM public.club_event_registrations WHERE id = _registration_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF NOT public.manages_event_club(reg.event_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  PERFORM set_config('app.checkin_ok', '1', true);
  UPDATE public.club_event_registrations
  SET checked_in_at = CASE WHEN _present THEN COALESCE(reg.checked_in_at, now()) ELSE NULL END
  WHERE id = _registration_id;
  PERFORM set_config('app.checkin_ok', '0', true);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.club_event_set_checkin(uuid, boolean) TO authenticated;
