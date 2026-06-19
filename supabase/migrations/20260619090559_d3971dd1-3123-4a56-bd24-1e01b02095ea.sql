
-- EBOOKS
CREATE TABLE public.ebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  description text,
  cover_path text,
  file_path text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO service_role;

ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ebooks" ON public.ebooks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert ebooks" ON public.ebooks
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update ebooks" ON public.ebooks
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete ebooks" ON public.ebooks
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_ebooks_updated_at BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GALLERY
CREATE TYPE public.gallery_media_type AS ENUM ('photo','video');

CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  media_type public.gallery_media_type NOT NULL,
  file_path text NOT NULL,
  thumbnail_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view gallery" ON public.gallery_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert gallery" ON public.gallery_items
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update gallery" ON public.gallery_items
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete gallery" ON public.gallery_items
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_gallery_items_updated_at BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GALLERY LIKES
CREATE TABLE public.gallery_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_item_id uuid NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_item_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.gallery_likes TO authenticated;
GRANT ALL ON public.gallery_likes TO service_role;

ALTER TABLE public.gallery_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view likes" ON public.gallery_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members like as self" ON public.gallery_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members unlike own" ON public.gallery_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX gallery_likes_item_idx ON public.gallery_likes(gallery_item_id);
