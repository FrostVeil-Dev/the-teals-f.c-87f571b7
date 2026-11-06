CREATE TABLE public.site_content (
  key text PRIMARY KEY CHECK (char_length(key) BETWEEN 1 AND 200),
  value text NOT NULL CHECK (char_length(value) <= 20000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads site content" ON public.site_content
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add site content" ON public.site_content
  FOR INSERT TO authenticated WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins edit site content" ON public.site_content
  FOR UPDATE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3) WITH CHECK (public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins reset site content" ON public.site_content
  FOR DELETE TO authenticated USING (public.user_rank_level(auth.uid()) >= 3);

CREATE OR REPLACE FUNCTION public.stamp_site_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER stamp_site_content
  BEFORE INSERT OR UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.stamp_site_content();

-- Site media: images uploaded through the in-site editor.
CREATE POLICY "Anyone views site media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'site-media');
CREATE POLICY "Admins upload site media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-media' AND public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins replace site media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'site-media' AND public.user_rank_level(auth.uid()) >= 3)
  WITH CHECK (bucket_id = 'site-media' AND public.user_rank_level(auth.uid()) >= 3);
CREATE POLICY "Admins delete site media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'site-media' AND public.user_rank_level(auth.uid()) >= 3);