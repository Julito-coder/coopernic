-- Roles enum (séparé pour la sécurité)
CREATE TYPE public.app_role AS ENUM ('superadmin', 'gestionnaire', 'membre');

-- Clubs
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  gestionnaire_id UUID,
  open_to_network BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members (linked to auth.users via id)
CREATE TABLE public.members (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  sector TEXT,
  city TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  looking_for TEXT[] DEFAULT ARRAY[]::TEXT[],
  can_offer TEXT[] DEFAULT ARRAY[]::TEXT[],
  invited_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_club_id ON public.members(club_id);

-- User roles (NEVER on profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, club_id)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Security definer function to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get the club_id this user manages (if any)
CREATE OR REPLACE FUNCTION public.managed_club_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'gestionnaire'
  LIMIT 1
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- CLUBS policies
CREATE POLICY "Anyone authenticated can view clubs"
  ON public.clubs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmin manages all clubs"
  ON public.clubs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Gestionnaire updates their own club"
  ON public.clubs FOR UPDATE TO authenticated
  USING (id = public.managed_club_id(auth.uid()))
  WITH CHECK (id = public.managed_club_id(auth.uid()));

-- MEMBERS policies
CREATE POLICY "Members see their own profile"
  ON public.members FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Members see same club"
  ON public.members FOR SELECT TO authenticated
  USING (
    club_id IS NOT NULL
    AND club_id = (SELECT club_id FROM public.members WHERE id = auth.uid())
  );

CREATE POLICY "Members see members of open-network clubs (reciprocity)"
  ON public.members FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT id FROM public.clubs WHERE open_to_network = true)
    AND (SELECT club_id FROM public.members WHERE id = auth.uid()) IN (
      SELECT id FROM public.clubs WHERE open_to_network = true
    )
  );

CREATE POLICY "Superadmin sees all members"
  ON public.members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Members update their own profile"
  ON public.members FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Gestionnaire manages members of their club"
  ON public.members FOR ALL TO authenticated
  USING (club_id = public.managed_club_id(auth.uid()))
  WITH CHECK (club_id = public.managed_club_id(auth.uid()));

CREATE POLICY "Superadmin manages all members"
  ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- USER_ROLES policies
CREATE POLICY "Users see their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmin manages all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Gestionnaire sees roles in their club"
  ON public.user_roles FOR SELECT TO authenticated
  USING (club_id = public.managed_club_id(auth.uid()));