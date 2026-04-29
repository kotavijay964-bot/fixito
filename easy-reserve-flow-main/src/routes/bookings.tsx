import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/services";
import { STATUS_LABEL, STATUS_STYLE, type BookingStatus } from "@/lib/booking-status";
import { cn } from "@/lib/utils";
import { LiveMap, haversineKm } from "@/components/LiveMap";
import { CustomerExtraCharges } from "@/components/ExtraCharges";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My bookings — FixIt" },
      { name: "description", content: "Track your service bookings live with map + progress." },
    ],
  }),
  component: BookingsPage,
});

type BookingRow = {
  id: string;
  service_category: string;
  booking_type: "normal" | "emergency";
  base_price: number;
  surcharge: number;
  approved_extras_total: number;
  total_price: number;
  address: string;
  problem_description: string | null;
  status: BookingStatus;
  created_at: string;
  worker_id: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  worker_lat: number | null;
  worker_lng: number | null;
  worker_location_updated_at: string | null;
};

const SELECT_COLS =
  "id, service_category, booking_type, base_price, surcharge, approved_extras_total, total_price, address, problem_description, status, created_at, worker_id, customer_lat, customer_lng, worker_lat, worker_lng, worker_location_updated_at";

const STEPS: { key: BookingStatus | "assigned"; label: string }[] = [
  { key: "pending", label: "Booked" },
  { key: "assigned", label: "Worker Assigned" },
  { key: "accepted", label: "Accepted" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

function stepIndex(b: BookingRow): number {
  if (b.status === "completed") return 4;
  if (b.status === "in_progress") return 3;
  if (b.status === "accepted") return 2;
  if (b.worker_id) return 1;
  return 0;
}

function BookingsPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/bookings" } });
      return;
    }
    if (role === "worker") {
      navigate({ to: "/worker" });
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(SELECT_COLS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setBookings(data as BookingRow[]);
    };
    void load();

    const channel = supabase
      .channel(`user-bookings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user, role, loading, navigate]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              My bookings
            </h1>
            <p className="mt-2 text-muted-foreground">Live status, map tracking, and bills.</p>
          </div>
          <Button asChild>
            <Link to="/booking">New booking</Link>
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {!bookings && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        )}

        {bookings && bookings.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">No bookings yet</h2>
              <p className="text-sm text-muted-foreground">
                Book your first service in under a minute.
              </p>
              <Button asChild className="mt-2">
                <Link to="/booking">Book a service</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {bookings && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: BookingRow }) {
  const idx = stepIndex(b);
  const customer =
    b.customer_lat != null && b.customer_lng != null
      ? { lat: b.customer_lat, lng: b.customer_lng }
      : null;
  const worker =
    b.worker_lat != null && b.worker_lng != null
      ? { lat: b.worker_lat, lng: b.worker_lng }
      : null;
  const distanceKm = customer && worker ? haversineKm(customer, worker) : null;
  // Naive ETA at 30km/h average city speed
  const etaMin = distanceKm != null ? Math.max(1, Math.round((distanceKm / 30) * 60)) : null;
  const lastSeen = b.worker_location_updated_at
    ? new Date(b.worker_location_updated_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{b.service_category}</h3>
            <Badge className={cn("capitalize", STATUS_STYLE[b.status])}>
              {STATUS_LABEL[b.status]}
            </Badge>
            {b.booking_type === "emergency" && (
              <Badge className="bg-emergency text-emergency-foreground hover:bg-emergency">
                <Zap className="mr-1 h-3 w-3" /> Emergency
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
            {new Date(b.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        </div>

        {/* Progress tracker */}
        <ProgressTracker currentIdx={idx} />

        {/* Address */}
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{b.address}</span>
        </div>
        {b.problem_description && (
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-foreground">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{b.problem_description}</span>
          </div>
        )}

        {/* Live map (only when worker assigned) */}
        {b.worker_id && customer && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live tracking
              </div>
              {worker && etaMin != null && (
                <div className="text-xs text-foreground">
                  <Navigation className="mr-1 inline h-3.5 w-3.5 text-primary" />
                  {distanceKm?.toFixed(1)} km • ETA ~{etaMin} min
                  {lastSeen && (
                    <span className="ml-2 text-muted-foreground">updated {lastSeen}</span>
                  )}
                </div>
              )}
            </div>
            <LiveMap customer={customer} worker={worker} height={240} />
            {!worker && (
              <p className="text-xs text-muted-foreground">
                Worker location appears once they start the job.
              </p>
            )}
          </div>
        )}

        {/* Extra charges */}
        <CustomerExtraCharges bookingId={b.id} isCustomer={true} />

        {/* Final bill */}
        <FinalBill booking={b} />
      </CardContent>
    </Card>
  );
}

function ProgressTracker({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    done && "border-success bg-success text-success-foreground",
                    active && "border-primary bg-primary text-primary-foreground",
                    !done && !active && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-4 h-0.5 flex-1 rounded",
                    i < currentIdx ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FinalBill({ booking: b }: { booking: BookingRow }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Bill
      </div>
      <dl className="space-y-1 text-sm">
        <Row label="Base service" value={formatINR(b.base_price)} />
        {b.surcharge > 0 && (
          <Row label="Emergency (+25%)" value={`+ ${formatINR(b.surcharge)}`} accent />
        )}
        {b.approved_extras_total > 0 && (
          <Row
            label="Approved extra charges"
            value={`+ ${formatINR(b.approved_extras_total)}`}
          />
        )}
      </dl>
      <div className="mt-3 flex items-baseline justify-between border-t pt-3">
        <span className="text-sm font-medium text-muted-foreground">
          {b.status === "completed" ? "Total paid" : "Total"}
        </span>
        <span className="text-2xl font-bold text-foreground">{formatINR(b.total_price)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", accent ? "text-emergency" : "text-foreground")}>{value}</dd>
    </div>
  );
}
