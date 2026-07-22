
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS office_address text,
  ADD COLUMN IF NOT EXISTS office_lat double precision,
  ADD COLUMN IF NOT EXISTS office_lng double precision,
  ADD COLUMN IF NOT EXISTS share_office_location boolean NOT NULL DEFAULT false;
