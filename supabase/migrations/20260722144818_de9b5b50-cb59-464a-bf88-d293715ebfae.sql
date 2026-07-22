
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS notify_on_create boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS remind_non_responders boolean NOT NULL DEFAULT true;

-- Update dispatcher to respect the new flags
CREATE OR REPLACE FUNCTION public.dispatch_event_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev RECORD;
BEGIN
  -- 1) New event notifications (only if enabled by creator)
  FOR ev IN
    SELECT * FROM public.events
    WHERE notified_new_at IS NULL
      AND notify_on_create = true
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

  -- 2) Vote reminders 20-28h before, only if enabled and members haven't responded
  FOR ev IN
    SELECT * FROM public.events
    WHERE reminder_sent_at IS NULL
      AND remind_non_responders = true
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
$function$;
