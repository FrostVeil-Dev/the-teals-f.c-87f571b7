-- Approved = active account that an Admin+ has reviewed (Admin+ ranks always count as approved)
CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id AND p.status = 'active'
      AND (p.is_reviewed OR public.rank_level(ur.role) >= 3)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_approved_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated;

-- Team chat needs approval too
CREATE OR REPLACE FUNCTION public.has_chat_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_member(_user_id) AND EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id AND p.status = 'active'
      AND (p.chat_access OR ur.role = 'web_handler')
  )
$$;

-- Approving a signup makes them a reviewed Member with Team Chat unlocked
CREATE OR REPLACE FUNCTION public.approve_member(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_member(auth.uid(), _target) THEN RAISE EXCEPTION 'You do not have permission to review this member'; END IF;
  UPDATE public.profiles SET is_reviewed = true, chat_access = true WHERE id = _target;
END $$;

-- Club sections: only signed-in, approved members can read
DROP POLICY IF EXISTS "Anyone reads announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone reads club info" ON public.club_info;
DROP POLICY IF EXISTS "Anyone reads fixtures" ON public.fixtures;
DROP POLICY IF EXISTS "Anyone reads league stats" ON public.league_stats;
DROP POLICY IF EXISTS "Anyone reads playbook" ON public.playbook_tactics;
DROP POLICY IF EXISTS "Anyone reads squad" ON public.squad_members;
DROP POLICY IF EXISTS "Anyone reads staff" ON public.staff;
DROP POLICY IF EXISTS "Anyone reads principles" ON public.team_principles;
DROP POLICY IF EXISTS "Anyone reads news" ON public.transfers_news;

CREATE POLICY "Approved members read announcements" ON public.announcements FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read club info" ON public.club_info FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read fixtures" ON public.fixtures FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read league stats" ON public.league_stats FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read playbook" ON public.playbook_tactics FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read squad" ON public.squad_members FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read staff" ON public.staff FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read principles" ON public.team_principles FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));
CREATE POLICY "Approved members read news" ON public.transfers_news FOR SELECT TO authenticated USING (public.is_approved_member(auth.uid()));

REVOKE SELECT ON public.announcements, public.club_info, public.fixtures, public.league_stats, public.playbook_tactics,
  public.squad_members, public.staff, public.team_principles, public.transfers_news FROM anon;