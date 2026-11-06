-- ===================== RANKS & PROFILES =====================
CREATE TYPE public.club_rank AS ENUM ('web_handler', 'co_owner', 'admin', 'moderator', 'member');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Teals Member',
  email text NOT NULL DEFAULT '',
  photo_url text,
  chat_access boolean NOT NULL DEFAULT false,
  is_reviewed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.club_rank NOT NULL DEFAULT 'member'
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rank_level(_role public.club_rank)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role
    WHEN 'web_handler' THEN 5
    WHEN 'co_owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'moderator' THEN 2
    ELSE 1 END
$$;

CREATE OR REPLACE FUNCTION public.rank_label(_role public.club_rank)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role
    WHEN 'web_handler' THEN 'WEB HANDLER'
    WHEN 'co_owner' THEN 'Co-Owner'
    WHEN 'admin' THEN 'Admin'
    WHEN 'moderator' THEN 'Moderator'
    ELSE 'Member' END
$$;

-- Active member's rank level (0 when signed out, missing or removed)
CREATE OR REPLACE FUNCTION public.user_rank_level(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT public.rank_level(ur.role)
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND p.status = 'active'
  ), 0)
$$;

CREATE OR REPLACE FUNCTION public.has_chat_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id AND p.status = 'active'
      AND (p.chat_access OR ur.role = 'web_handler')
  )
$$;

CREATE POLICY "Own profile or admins read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.user_rank_level(auth.uid()) >= 3);

CREATE POLICY "Own rank or admins read ranks" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_rank_level(auth.uid()) >= 3);

-- ===================== NEW USER / OWNER PROMOTION =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_owner boolean := lower(coalesce(NEW.email, '')) = 'imhenil07@gmail.com' AND NEW.email_confirmed_at IS NOT NULL;
BEGIN
  INSERT INTO public.profiles (id, display_name, email, photo_url, chat_access, is_reviewed)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), NULLIF(split_part(coalesce(NEW.email, ''), '@', 1), ''), 'Teals Member'),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    is_owner,
    is_owner
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_owner THEN 'web_handler'::public.club_rank ELSE 'member'::public.club_rank END)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Owner email becomes WEB HANDLER once that email address is verified
CREATE OR REPLACE FUNCTION public.handle_owner_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) = 'imhenil07@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.user_roles SET role = 'web_handler' WHERE user_id = NEW.id;
    UPDATE public.profiles SET chat_access = true, is_reviewed = true, status = 'active' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_owner_email_confirmed();

-- ===================== MEMBER MANAGEMENT ACTIONS =====================
CREATE OR REPLACE FUNCTION public.assign_rank(_target uuid, _new_role public.club_rank)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  caller_role public.club_rank;
  target_role public.club_rank;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'You must be signed in'; END IF;
  IF public.user_rank_level(caller) < 3 THEN RAISE EXCEPTION 'Admin rank or higher is required'; END IF;
  SELECT role INTO caller_role FROM public.user_roles WHERE user_id = caller;
  SELECT role INTO target_role FROM public.user_roles WHERE user_id = _target;
  IF target_role IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF caller = _target THEN RAISE EXCEPTION 'You cannot change your own rank'; END IF;
  IF target_role = 'web_handler' THEN RAISE EXCEPTION 'The WEB HANDLER cannot be demoted or changed'; END IF;
  IF _new_role = 'web_handler' THEN RAISE EXCEPTION 'The WEB HANDLER rank cannot be assigned'; END IF;
  IF (public.rank_level(target_role) >= 3 OR public.rank_level(_new_role) >= 3) AND caller_role <> 'web_handler' THEN
    RAISE EXCEPTION 'Only the WEB HANDLER can change Admin and Co-Owner ranks';
  END IF;
  IF caller_role <> 'web_handler' AND (public.rank_level(target_role) >= public.rank_level(caller_role) OR public.rank_level(_new_role) >= public.rank_level(caller_role)) THEN
    RAISE EXCEPTION 'You can only manage ranks below your own';
  END IF;
  UPDATE public.user_roles SET role = _new_role WHERE user_id = _target;
END $$;

CREATE OR REPLACE FUNCTION public.can_manage_member(_caller uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _caller IS NOT NULL AND _caller <> _target
    AND public.user_rank_level(_caller) >= 3
    AND EXISTS (SELECT 1 FROM public.user_roles t WHERE t.user_id = _target AND t.role <> 'web_handler'
      AND (public.user_rank_level(_caller) = 5 OR public.rank_level(t.role) < 3))
$$;

CREATE OR REPLACE FUNCTION public.set_chat_access(_target uuid, _access boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_member(auth.uid(), _target) THEN RAISE EXCEPTION 'You do not have permission to change this member''s chat access'; END IF;
  UPDATE public.profiles SET chat_access = _access WHERE id = _target;
END $$;

CREATE OR REPLACE FUNCTION public.approve_member(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_member(auth.uid(), _target) THEN RAISE EXCEPTION 'You do not have permission to review this member'; END IF;
  UPDATE public.profiles SET is_reviewed = true WHERE id = _target;
END $$;

CREATE OR REPLACE FUNCTION public.remove_member(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.user_rank_level(auth.uid()) < 5 THEN RAISE EXCEPTION 'Only the WEB HANDLER can remove members'; END IF;
  IF auth.uid() = _target THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target AND role = 'web_handler') THEN RAISE EXCEPTION 'The WEB HANDLER cannot be removed'; END IF;
  UPDATE public.profiles SET status = 'removed', chat_access = false WHERE id = _target;
  UPDATE public.user_roles SET role = 'member' WHERE user_id = _target;
END $$;

CREATE OR REPLACE FUNCTION public.restore_member(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.user_rank_level(auth.uid()) < 5 THEN RAISE EXCEPTION 'Only the WEB HANDLER can restore members'; END IF;
  UPDATE public.profiles SET status = 'active' WHERE id = _target;
END $$;

REVOKE EXECUTE ON FUNCTION public.assign_rank(uuid, public.club_rank) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_chat_access(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_rank(uuid, public.club_rank) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_chat_access(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_member(uuid) TO authenticated;

-- ===================== CLUB CONTENT =====================
CREATE TABLE public.club_info (
  id text PRIMARY KEY DEFAULT 'main',
  name text NOT NULL DEFAULT 'The Teals F.C.',
  motto text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  history text NOT NULL DEFAULT '',
  home_ground text NOT NULL DEFAULT '',
  training_schedule text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '/assets/aistudio/teals_logo_e43437ce.png',
  kits_url text NOT NULL DEFAULT '/assets/aistudio/teals_kit_c5ea6daf.png',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_info TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_info TO authenticated;
GRANT ALL ON public.club_info TO service_role;
ALTER TABLE public.club_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads club info" ON public.club_info FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins edit club info" ON public.club_info FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);

CREATE TABLE public.league_stats (
  id text PRIMARY KEY DEFAULT 'main',
  played integer NOT NULL DEFAULT 0,
  won integer NOT NULL DEFAULT 0,
  drawn integer NOT NULL DEFAULT 0,
  lost integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  goal_difference integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  position text NOT NULL DEFAULT '1st'
);
GRANT SELECT ON public.league_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_stats TO authenticated;
GRANT ALL ON public.league_stats TO service_role;
ALTER TABLE public.league_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads league stats" ON public.league_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins edit league stats" ON public.league_stats FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);

CREATE TABLE public.announcements (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 5000),
  date date NOT NULL DEFAULT current_date,
  author text NOT NULL DEFAULT 'Staff',
  author_role text NOT NULL DEFAULT 'Moderator',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Moderators post announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 2);
CREATE POLICY "Moderators edit announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 2) WITH CHECK (public.user_rank_level(auth.uid()) >= 2);
CREATE POLICY "Moderators delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 2);

-- Author name and rank always come from the signed-in poster
CREATE OR REPLACE FUNCTION public.set_announcement_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT p.display_name, public.rank_label(ur.role) INTO NEW.author, NEW.author_role
    FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id WHERE p.id = auth.uid();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER announcements_set_author BEFORE INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_announcement_author();

CREATE TABLE public.transfers_news (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL DEFAULT 'news' CHECK (type IN ('transfer-in', 'transfer-out', 'news')),
  category text NOT NULL DEFAULT 'News',
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 10000),
  image text,
  date date NOT NULL DEFAULT current_date,
  badge text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transfers_news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers_news TO authenticated;
GRANT ALL ON public.transfers_news TO service_role;
ALTER TABLE public.transfers_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads news" ON public.transfers_news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Moderators post news" ON public.transfers_news FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 2);
CREATE POLICY "Moderators edit news" ON public.transfers_news FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 2) WITH CHECK (public.user_rank_level(auth.uid()) >= 2);
CREATE POLICY "Moderators delete news" ON public.transfers_news FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 2);

CREATE TABLE public.fixtures (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('upcoming', 'result')),
  date date NOT NULL DEFAULT current_date,
  time text,
  competition text NOT NULL DEFAULT 'Premier School League',
  opponent text NOT NULL CHECK (char_length(opponent) BETWEEN 1 AND 120),
  opponent_logo text,
  venue text,
  status text,
  team_score integer,
  opponent_score integer,
  outcome text CHECK (outcome IS NULL OR outcome IN ('W', 'D', 'L')),
  scorers text,
  assists text,
  report text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fixtures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixtures TO authenticated;
GRANT ALL ON public.fixtures TO service_role;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads fixtures" ON public.fixtures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add fixtures" ON public.fixtures FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins edit fixtures" ON public.fixtures FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins delete fixtures" ON public.fixtures FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3);

CREATE TABLE public.playbook_tactics (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category text NOT NULL DEFAULT 'Custom Play',
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  key_players text,
  sheet_page integer,
  sort_order integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.playbook_tactics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_tactics TO authenticated;
GRANT ALL ON public.playbook_tactics TO service_role;
ALTER TABLE public.playbook_tactics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads playbook" ON public.playbook_tactics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add tactics" ON public.playbook_tactics FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins edit tactics" ON public.playbook_tactics FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins delete tactics" ON public.playbook_tactics FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3);

CREATE TABLE public.team_principles (
  num integer PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL
);
GRANT SELECT ON public.team_principles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_principles TO authenticated;
GRANT ALL ON public.team_principles TO service_role;
ALTER TABLE public.team_principles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads principles" ON public.team_principles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage principles" ON public.team_principles FOR ALL TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);

CREATE TABLE public.squad_members (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  number integer,
  position text NOT NULL DEFAULT '',
  card_position text NOT NULL DEFAULT 'CF',
  rating integer NOT NULL DEFAULT 98,
  category text NOT NULL DEFAULT 'Forward' CHECK (category IN ('Forward', 'Midfielder', 'Defender', 'Goalkeeper')),
  club_role text NOT NULL DEFAULT 'Member',
  tactical_role text,
  photo text,
  card_image text,
  chat_access boolean NOT NULL DEFAULT false,
  bio text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.squad_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squad_members TO authenticated;
GRANT ALL ON public.squad_members TO service_role;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads squad" ON public.squad_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add players" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins edit players" ON public.squad_members FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins delete players" ON public.squad_members FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3 AND club_role <> 'WEB HANDLER');

CREATE TABLE public.staff (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  tag text NOT NULL DEFAULT '@STAFF',
  callsign text,
  role text NOT NULL,
  department text NOT NULL DEFAULT 'Executive & Management',
  tone text NOT NULL DEFAULT 'teal',
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  collaboration_note text,
  photo text,
  icon_type text,
  sort_order integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads staff" ON public.staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add staff" ON public.staff FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins edit staff" ON public.staff FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins delete staff" ON public.staff FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3);

-- ===================== TEAM CHAT =====================
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Teals Member',
  author_role text NOT NULL DEFAULT 'Member',
  author_photo text,
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat members read messages" ON public.chat_messages FOR SELECT TO authenticated USING (public.has_chat_access(auth.uid()));
CREATE POLICY "Chat members send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (public.has_chat_access(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "Authors and moderators delete messages" ON public.chat_messages FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.user_rank_level(auth.uid()) >= 2);

CREATE OR REPLACE FUNCTION public.set_chat_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.author_id := auth.uid();
    NEW.created_at := now();
    SELECT p.display_name, public.rank_label(ur.role), p.photo_url
      INTO NEW.author_name, NEW.author_role, NEW.author_photo
    FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id WHERE p.id = auth.uid();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER chat_messages_set_author BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_author();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;