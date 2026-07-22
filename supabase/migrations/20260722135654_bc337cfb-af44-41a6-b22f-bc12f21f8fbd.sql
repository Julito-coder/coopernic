ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS attendance_required boolean NOT NULL DEFAULT false;