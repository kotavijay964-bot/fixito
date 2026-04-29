
-- 1) Add geolocation + worker location tracking to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS customer_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS worker_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS worker_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS worker_location_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_extras_total INTEGER NOT NULL DEFAULT 0;

-- 2) Extra charges table
CREATE TABLE IF NOT EXISTS public.booking_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  image_paths TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;

-- Customers can see extras for their bookings
CREATE POLICY "Customer reads own booking extras" ON public.booking_extras
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
  );

-- Worker can see extras they created (or for jobs assigned to them)
CREATE POLICY "Worker reads own extras" ON public.booking_extras
  FOR SELECT TO authenticated USING (
    worker_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.worker_id = auth.uid())
  );

-- Worker (assigned) can insert extras for their booking
CREATE POLICY "Worker inserts extras for assigned booking" ON public.booking_extras
  FOR INSERT TO authenticated WITH CHECK (
    worker_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.worker_id = auth.uid())
  );

-- Customer can update status (approve/reject) on their own booking's extras
CREATE POLICY "Customer decides on extras" ON public.booking_extras
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
  );

-- 3) Trigger: when extra is approved/rejected, recompute approved_extras_total + total_price
CREATE OR REPLACE FUNCTION public.recompute_booking_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bid UUID;
  extras_sum INTEGER;
  base INTEGER;
  surch INTEGER;
BEGIN
  bid := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT COALESCE(SUM(amount), 0) INTO extras_sum
  FROM public.booking_extras
  WHERE booking_id = bid AND status = 'approved';

  SELECT base_price, surcharge INTO base, surch
  FROM public.bookings WHERE id = bid;

  UPDATE public.bookings
  SET approved_extras_total = extras_sum,
      total_price = COALESCE(base, 0) + COALESCE(surch, 0) + extras_sum
  WHERE id = bid;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_total_aiud ON public.booking_extras;
CREATE TRIGGER trg_recompute_total_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.booking_extras
FOR EACH ROW EXECUTE FUNCTION public.recompute_booking_total();

-- 4) Storage bucket for proof images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-proofs', 'booking-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public read booking proofs" ON storage.objects;
CREATE POLICY "Public read booking proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'booking-proofs');

DROP POLICY IF EXISTS "Workers upload to own folder" ON storage.objects;
CREATE POLICY "Workers upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'booking-proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Workers update own files" ON storage.objects;
CREATE POLICY "Workers update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'booking-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Workers delete own files" ON storage.objects;
CREATE POLICY "Workers delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'booking-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
