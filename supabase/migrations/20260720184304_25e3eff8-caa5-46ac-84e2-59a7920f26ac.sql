
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_notifications_event ON public.notifications(event_id);

-- Track cron state on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS notified_new_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Cron dispatcher: creates notifications for new events + vote reminders
CREATE OR REPLACE FUNCTION public.dispatch_event_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev RECORD;
BEGIN
  -- 1) New event notifications (never notified yet)
  FOR ev IN
    SELECT * FROM public.events
    WHERE notified_new_at IS NULL
      AND starts_at > now()
  LOOP
    INSERT INTO public.notifications (user_id, club_id, event_id, type, title, body, link)
    SELECT m.id, ev.club_id, ev.id, 'new_event',
           'Nouvel évènement : ' || ev.title,
           to_char(ev.starts_at AT TIME ZONE 'Europe/Paris', 'Dy DD Mon à HH24:MI')
             || COALESCE(' · ' || ev.location_name, ''),
           '/evenements'
    FROM public.members m
    WHERE m.club_id = ev.club_id;

    UPDATE public.events SET notified_new_at = now() WHERE id = ev.id;
  END LOOP;

  -- 2) Vote reminders: events starting in 20-28h, no reminder yet, only for members who haven't responded
  FOR ev IN
    SELECT * FROM public.events
    WHERE reminder_sent_at IS NULL
      AND poll_question IS NOT NULL
      AND jsonb_typeof(poll_options) = 'array'
      AND jsonb_array_length(poll_options) > 0
      AND starts_at BETWEEN now() + interval '20 hours' AND now() + interval '28 hours'
  LOOP
    INSERT INTO public.notifications (user_id, club_id, event_id, type, title, body, link)
    SELECT m.id, ev.club_id, ev.id, 'vote_reminder',
           'Réponds au sondage : ' || ev.title,
           'L''évènement approche, indique ta présence.',
           '/evenements'
    FROM public.members m
    LEFT JOIN public.event_responses r ON r.event_id = ev.id AND r.user_id = m.id
    WHERE m.club_id = ev.club_id AND r.user_id IS NULL;

    UPDATE public.events SET reminder_sent_at = now() WHERE id = ev.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_event_notifications() FROM PUBLIC;
