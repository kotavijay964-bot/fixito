import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AlertTriangle, MapPin, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICES, calculatePricing, formatINR, getService } from "@/lib/services";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VoiceInput } from "@/components/VoiceInput";

const searchSchema = z.object({
  service: z.string().optional(),
});

export const Route = createFileRoute("/booking")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Book a service — FixIt" },
      {
        name: "description",
        content:
          "Choose your service and address, and confirm your booking with transparent INR pricing.",
      },
    ],
  }),
  component: BookingPage,
});

const bookingSchema = z.object({
  serviceId: z.string().min(1, "Choose a service"),
  type: z.enum(["normal", "emergency"]),
  address: z
    .string()
    .trim()
    .min(10, "Please enter a complete address (min 10 characters)")
    .max(500, "Address too long"),
  problemDescription: z.string().trim().max(2000, "Description too long").optional(),
});

function BookingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [serviceId, setServiceId] = useState<string>(search.service ?? SERVICES[0].id);
  const [type, setType] = useState<"normal" | "emergency">("normal");
  const [address, setAddress] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const service = getService(serviceId) ?? SERVICES[0];
  const pricing = useMemo(() => calculatePricing(service, type), [service, type]);

  const captureLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured for live tracking.");
        setLocating(false);
      },
      (err) => {
        toast.error(err.message || "Unable to get location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Try to capture once on load
  useEffect(() => {
    if (!coords && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 6000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    const parsed = bookingSchema.safeParse({
      serviceId,
      type,
      address,
      problemDescription,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) {
      toast.info("Please sign in to confirm your booking.");
      navigate({ to: "/auth", search: { redirect: "/booking" } });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        user_id: user.id,
        service_category: service.name,
        service_category_id: service.id,
        booking_type: type,
        items: 1,
        base_price: pricing.basePrice,
        item_price: 0,
        surcharge: pricing.surcharge,
        total_price: pricing.total,
        address: address.trim(),
        problem_description: problemDescription.trim() || null,
        customer_lat: coords?.lat ?? null,
        customer_lng: coords?.lng ?? null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Booking confirmed!", {
        description: `${service.name} • ${formatINR(pricing.total)}`,
      });
      navigate({ to: "/bookings" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save booking";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Book a service
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick a category, share your location, and confirm — flat pricing in ₹.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <div className="space-y-6">
            {/* Service */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Service category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SERVICES.map((s) => {
                    const active = s.id === serviceId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceId(s.id)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all",
                          active
                            ? "border-primary bg-accent shadow-[var(--shadow-md)]"
                            : "border-border bg-card hover:border-primary/40",
                        )}
                      >
                        <div className="text-2xl">{s.emoji}</div>
                        <div className="mt-2 text-sm font-semibold text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatINR(s.basePrice)} flat
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Booking type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Booking type</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setType("normal")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    type === "normal"
                      ? "border-primary bg-accent shadow-[var(--shadow-md)]"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">Normal</div>
                    <div className="text-xs text-muted-foreground">
                      Standard scheduling within 24h
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType("emergency")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    type === "emergency"
                      ? "border-emergency bg-emergency/10 shadow-[var(--shadow-md)]"
                      : "border-border bg-card hover:border-emergency/40",
                  )}
                >
                  <Zap
                    className={cn(
                      "mt-0.5 h-5 w-5",
                      type === "emergency" ? "text-emergency" : "text-muted-foreground",
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Emergency</span>
                      <Badge className="bg-emergency text-emergency-foreground hover:bg-emergency">
                        +25%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Priority dispatch within the hour
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Service address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="address" className="sr-only">
                  Address
                </Label>
                <Textarea
                  id="address"
                  placeholder="House / flat no., street, area, city, pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  maxLength={500}
                  required
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant={coords ? "outline" : "secondary"}
                    size="sm"
                    onClick={captureLocation}
                    disabled={locating}
                  >
                    <MapPin className="mr-1.5 h-4 w-4" />
                    {locating
                      ? "Getting location..."
                      : coords
                        ? "Update live location"
                        : "Share live location"}
                  </Button>
                  {coords && (
                    <span className="text-xs text-success">
                      ✓ Live tracking enabled ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sharing location lets your worker navigate to you faster.
                </p>
              </CardContent>
            </Card>

            {/* Problem description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  4. Describe the problem{" "}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="problem" className="text-xs text-muted-foreground">
                    Type or speak in any language — we'll transcribe it.
                  </Label>
                  <VoiceInput
                    onTranscript={(text) =>
                      setProblemDescription((prev) =>
                        prev.trim() ? `${prev.trim()} ${text}` : text,
                      )
                    }
                  />
                </div>
                <Textarea
                  id="problem"
                  placeholder="e.g. Kitchen sink is leaking and the cabinet underneath is damp…"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {problemDescription.trim().length}/2000
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card
              className={cn(
                "overflow-hidden",
                type === "emergency" && "border-emergency/50 shadow-[var(--shadow-md)]",
              )}
            >
              <CardHeader
                className={cn(
                  "border-b",
                  type === "emergency"
                    ? "bg-[image:var(--gradient-emergency)] text-emergency-foreground"
                    : "bg-[image:var(--gradient-primary)] text-primary-foreground",
                )}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Order summary</span>
                  {type === "emergency" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <AlertTriangle className="h-4 w-4" /> Emergency
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6 text-sm">
                <Row label="Service" value={`${service.emoji} ${service.name}`} />
                <div className="my-3 h-px bg-border" />
                <Row label="Base price" value={formatINR(pricing.basePrice)} />
                {pricing.surcharge > 0 && (
                  <Row
                    label="Emergency surcharge (25%)"
                    value={`+ ${formatINR(pricing.surcharge)}`}
                    accent
                  />
                )}
                <div className="my-3 h-px bg-border" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    {formatINR(pricing.total)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Worker may request approved extra charges if more work is needed.
                </p>
                <Button
                  className="mt-2 w-full"
                  size="lg"
                  onClick={handleConfirm}
                  disabled={submitting || loading}
                  variant={type === "emergency" ? "destructive" : "default"}
                >
                  {submitting ? "Confirming..." : "Confirm booking"}
                </Button>
                {!user && !loading && (
                  <p className="text-center text-xs text-muted-foreground">
                    You'll be asked to{" "}
                    <Link to="/auth" className="font-medium text-primary hover:underline">
                      sign in
                    </Link>{" "}
                    to confirm.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", accent ? "text-emergency" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
