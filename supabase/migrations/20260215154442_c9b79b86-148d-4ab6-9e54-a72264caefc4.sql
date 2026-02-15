
-- Fix setlists: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can create own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can delete own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can update own setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can view own setlists" ON public.setlists;

CREATE POLICY "Users can view own setlists"
  ON public.setlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own setlists"
  ON public.setlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own setlists"
  ON public.setlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own setlists"
  ON public.setlists FOR DELETE
  USING (auth.uid() = user_id);

-- Fix profiles: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);
