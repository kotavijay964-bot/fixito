import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Navigation,
  PlayCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR, SERVICES } from "@/lib/services";
import { STATUS_LABEL, STATUS_STYLE, type BookingStatus } from "@/lib/booking-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LiveMap, haversineKm } from "@/components/LiveMap";
import { useLiveWorkerLocation } from "@/hooks/use-live-location";
import { WorkerExtraChargeForm, CustomerExtraCharges } from "@/components/ExtraCharges";

export const Route = createFileRoute("/worker")({
  head: () => ({
    meta: [
      { title: "Worker dashboard — FixIt" },
      { name: "description", content: "Available jobs and your accepted work." },
    ],
  }),
  component: WorkerDashboard,
});

type Job = {
  id: string;
  user_id: string;
  worker_id: string | null;
  service_category: string;
  service_category_id: string | null;
  booking_type: "normal" | "emergency";
  base_price: number;
  surcharge: number;
  approved_extras_total: number;
  total_price: number;
  address: string;
  problem_description: string | null;
  status: BookingStatus;
  created_at: string;
  customer_lat: number | null;
  customer_lng: number | null;
  worker_lat: number | null;
  worker_lng: number | null;
};

const SELECT_COLS =
  "id, user_id, worker_id, service_category, service_category_id, booking_type, base_price, surcharge, approved_extras_total, total_price, address, problem_description, status, created_at, customer_lat, customer_lng, worker_lat, worker_lng";

function WorkerDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Pick the active in_progress job to broadcast worker location for.
  const activeJob = (jobs ?? []).find(
    (j) => j.worker_id === user?.id && j.status === "in_progress",
  );
  useLiveWorkerLocation({
    bookingId: activeJob?.id ?? null,
    enabled: !!activeJob,
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/worker" } });
      return;
    }
    if (role && role !== "worker") {
      navigate({ to: "/bookings" });
      return;
    }

    let cancelled = false;

    const load = async () => {
      const [{ data: cats }, { data: jobData, error }] = await Promise.all([
        supabase.from("worker_categories").select("category").eq("worker_id", user.id),
        supabase.from("bookings").select(SELECT_COLS).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setCategories((cats ?? []).map((c) => c.category as string));
      if (error) toast.error(error.message);
      else setJobs((jobData ?? []) as Job[]);
    };
    void load();

    const channel = supabase
      .channel(`worker-jobs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user, role, loading, navigate]);

  const updateStatus = async (job: Job, next: BookingStatus, claim = false) => {
    if (!user) return;
    setBusy(job.id);
    try {
      const patch: { status: BookingStatus; worker_id?: string } = { status: next };
      if (claim) patch.worker_id = user.id;
      const { error } = await supabase.from("bookings").update(patch).eq("id", job.id);
      if (error) throw error;
      toast.success(`Job ${STATUS_LABEL[next].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const available = (jobs ?? []).filter(
    (j) => j.status === "pending" && (j.worker_id === null || j.worker_id === user?.id),
  );
  const mine = (jobs ?? []).filter(
    (j) => j.worker_id === user?.id && j.status !== "pending",
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Worker Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Live jobs in your categories. Status, location, and extras sync to customers instantly.
          </p>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => {
                const s = SERVICES.find((x) => x.id === c);
                return (
                  <Badge key={c} variant="outline">
                    {s?.emoji} {s?.name ?? c}
                  </Badge>
                );
              })}
            </div>
          )}
          {activeJob && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Sharing your live location with the customer
            </div>
          )}
          {categories.length === 0 && jobs !== null && (
            <Card className="mt-4 border-warning/40 bg-warning/5">
              <CardContent className="pt-6 text-sm">
                You haven't selected any service categories. Sign up again as a worker, or contact
                support to add categories.
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">
              Available <Badge variant="secondary" className="ml-2">{available.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="mine">
              My Jobs <Badge variant="secondary" className="ml-2">{mine.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4 space-y-3">
            {jobs === null ? (
              [0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
            ) : available.length === 0 ? (
              <EmptyState text="No jobs available right now. We'll notify you in real-time." />
            ) : (
              available.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  workerId={user?.id ?? null}
                  busy={busy === j.id}
                  primary={{
                    label: "Accept Job",
                    onClick: () => updateStatus(j, "accepted", j.worker_id === null),
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-3">
            {jobs === null ? (
              [0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
            ) : mine.length === 0 ? (
              <EmptyState text="No accepted jobs yet." />
            ) : (
              mine.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  workerId={user?.id ?? null}
                  busy={busy === j.id}
                  showExtras
                  primary={
                    j.status === "accepted"
                      ? {
                          label: "Start Work",
                          icon: <PlayCircle className="mr-1 h-4 w-4" />,
                          onClick: () => updateStatus(j, "in_progress"),
                        }
                      : j.status === "in_progress"
                        ? {
                            label: "Mark Completed",
                            icon: <CheckCircle2 className="mr-1 h-4 w-4" />,
                            onClick: () => updateStatus(j, "completed"),
                          }
                        : undefined
                  }
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function JobCard({
  job,
  workerId,
  busy,
  primary,
  showExtras,
}: {
  job: Job;
  workerId: string | null;
  busy: boolean;
  primary?: { label: string; onClick: () => void; icon?: React.ReactNode };
  showExtras?: boolean;
}) {
  const customer = job.customer_lat != null && job.customer_lng != null
    ? { lat: job.customer_lat, lng: job.customer_lng }
    : null;
  const worker = job.worker_lat != null && job.worker_lng != null
    ? { lat: job.worker_lat, lng: job.worker_lng }
    : null;
  const distanceKm = customer && worker ? haversineKm(customer, worker) : null;
  const navUrl = customer
    ? `https://www.openstreetmap.org/directions?from=${worker ? `${worker.lat},${worker.lng}` : ""}&to=${customer.lat},${customer.lng}`
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span>{job.service_category}</span>
          <Badge className={cn("capitalize", STATUS_STYLE[job.status])}>
            {STATUS_LABEL[job.status]}
          </Badge>
          {job.booking_type === "emergency" && (
            <Badge className="bg-emergency text-emergency-foreground hover:bg-emergency">
              <Zap className="mr-1 h-3 w-3" /> Emergency
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {new Date(job.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {distanceKm != null && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Navigation className="h-3.5 w-3.5" /> {distanceKm.toFixed(1)} km away
                </span>
              )}
            </div>
            <div className="flex items-start gap-1.5 text-sm text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{job.address}</span>
            </div>
            {job.problem_description && (
              <div className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-foreground">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{job.problem_description}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Payout</div>
              <div className="text-2xl font-bold text-foreground">{formatINR(job.total_price)}</div>
              <div className="text-xs text-muted-foreground">
                base {formatINR(job.base_price)}
                {job.surcharge > 0 && ` + ${formatINR(job.surcharge)} surge`}
                {job.approved_extras_total > 0 &&
                  ` + ${formatINR(job.approved_extras_total)} extras`}
              </div>
            </div>
            {primary && (
              <Button onClick={primary.onClick} disabled={busy} className="min-w-36">
                {busy ? "Working..." : (
                  <>
                    {primary.icon}
                    {primary.label}
                  </>
                )}
              </Button>
            )}
            {navUrl && (
              <Button asChild size="sm" variant="outline">
                <a href={navUrl} target="_blank" rel="noreferrer">
                  <Navigation className="mr-1 h-4 w-4" /> Navigate
                </a>
              </Button>
            )}
          </div>
        </div>

        {(customer || worker) && (
          <LiveMap customer={customer} worker={worker} height={240} />
        )}

        {showExtras && workerId && (
          <div className="space-y-3 border-t pt-3">
            <CustomerExtraCharges bookingId={job.id} isCustomer={false} />
            {job.status !== "completed" && (
              <WorkerExtraChargeForm bookingId={job.id} workerId={workerId} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
