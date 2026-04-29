-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('user', 'worker');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Worker categories (many-to-many)
CREATE TABLE public.worker_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, category)
);

ALTER TABLE public.worker_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Worker categories viewable by authenticated"
  ON public.worker_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers manage own categories insert"
  ON public.worker_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers manage own categories delete"
  ON public.worker_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = worker_id);

-- 4. Helper: has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Update bookings: extend status enum, add worker_id and service_category_id
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_category_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_category_id ON public.bookings(service_category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- 6. Worker RLS for bookings
CREATE POLICY "Workers view assigned or matching pending jobs"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id
    OR (
      worker_id IS NULL
      AND status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.worker_categories wc
        WHERE wc.worker_id = auth.uid()
          AND wc.category = bookings.service_category_id
      )
    )
  );

CREATE POLICY "Workers update assigned jobs"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = worker_id);

-- Allow workers to claim a pending matching job (set worker_id to themselves)
CREATE POLICY "Workers claim pending matching jobs"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    worker_id IS NULL
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.worker_categories wc
      WHERE wc.worker_id = auth.uid()
        AND wc.category = bookings.service_category_id
    )
  );

-- 7. Auto-assign worker on insert
CREATE OR REPLACE FUNCTION public.auto_assign_worker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen UUID;
BEGIN
  IF NEW.service_category_id IS NULL OR NEW.worker_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Pick worker registered for this category with fewest active jobs
  SELECT wc.worker_id INTO chosen
  FROM public.worker_categories wc
  LEFT JOIN public.bookings b
    ON b.worker_id = wc.worker_id
    AND b.status IN ('pending','accepted','in_progress')
  WHERE wc.category = NEW.service_category_id
  GROUP BY wc.worker_id
  ORDER BY COUNT(b.id) ASC, RANDOM()
  LIMIT 1;

  IF chosen IS NOT NULL THEN
    NEW.worker_id := chosen;
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_worker
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_worker();

-- 8. updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 9. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 10. Realtime
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;