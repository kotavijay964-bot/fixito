/**
 * Live geolocation tracker for a worker. Updates the booking row's
 * worker_lat / worker_lng / worker_location_updated_at every ~10s
 * while a job is in_progress.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLiveWorkerLocation(opts: {
  bookingId: string | null;
  enabled: boolean;
  intervalMs?: number;
}) {
  const lastSent = useRef<number>(0);

  useEffect(() => {
    if (!opts.enabled || !opts.bookingId) return;
    if (!("geolocation" in navigator)) return;

    const interval = opts.intervalMs ?? 10000;

    const push = (lat: number, lng: number) => {
      lastSent.current = Date.now();
      void supabase
        .from("bookings")
        .update({
          worker_lat: lat,
          worker_lng: lng,
          worker_location_updated_at: new Date().toISOString(),
        })
        .eq("id", opts.bookingId!);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - lastSent.current >= interval) {
          push(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        console.warn("Geolocation error", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    // Send first ping immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => push(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [opts.bookingId, opts.enabled, opts.intervalMs]);
}
