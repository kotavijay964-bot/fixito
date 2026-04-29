import { useEffect, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/services";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type BookingExtra = {
  id: string;
  booking_id: string;
  worker_id: string;
  amount: number;
  reason: string;
  image_paths: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at: string | null;
};

const PROOFS_BUCKET = "booking-proofs";

export function publicProofUrl(path: string): string {
  return supabase.storage.from(PROOFS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Worker form to add a new extra charge with proof images */
export function WorkerExtraChargeForm({
  bookingId,
  workerId,
  onAdded,
}: {
  bookingId: string;
  workerId: string;
  onAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setAmount("");
    setReason("");
    setFiles([]);
  };

  const submit = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount in ₹");
      return;
    }
    if (reason.trim().length < 5) {
      toast.error("Please describe why the extra charge is needed");
      return;
    }
    setBusy(true);
    try {
      // Upload images
      const paths: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${workerId}/${bookingId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(PROOFS_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      }

      const { error } = await supabase.from("booking_extras").insert({
        booking_id: bookingId,
        worker_id: workerId,
        amount: amt,
        reason: reason.trim(),
        image_paths: paths,
        status: "pending",
      });
      if (error) throw error;

      toast.success("Extra charge sent for customer approval");
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add extra charge");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add extra charge
      </Button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 pt-5">
        <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
          <div>
            <Label htmlFor="amt" className="text-xs">
              Amount (₹)
            </Label>
            <Input
              id="amt"
              type="number"
              min={1}
              placeholder="300"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reason" className="text-xs">
              Reason
            </Label>
            <Textarea
              id="reason"
              rows={2}
              placeholder="e.g. Additional pipe leakage found near the joint"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Proof images (optional)</Label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="relative h-16 w-16 overflow-hidden rounded border bg-muted"
              >
                <img
                  src={URL.createObjectURL(f)}
                  alt="proof"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                  className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-muted">
              <ImagePlus className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...list].slice(0, 6));
                  e.target.value = "";
                }}
              />
            </label>
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-muted">
              <Camera className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...list].slice(0, 6));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
            Send for approval
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Customer view: list of extras with approve/reject */
export function CustomerExtraCharges({
  bookingId,
  isCustomer,
}: {
  bookingId: string;
  isCustomer: boolean;
}) {
  const [extras, setExtras] = useState<BookingExtra[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("booking_extras")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    setExtras((data ?? []) as BookingExtra[]);
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`extras-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_extras", filter: `booking_id=eq.${bookingId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const { error } = await supabase
        .from("booking_extras")
        .update({ status, decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Extra approved" : "Extra rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (!extras || extras.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Extra charges
      </div>
      {extras.map((e) => (
        <div
          key={e.id}
          className={cn(
            "rounded-lg border p-3 text-sm",
            e.status === "approved" && "border-success/40 bg-success/5",
            e.status === "rejected" && "border-destructive/40 bg-destructive/5",
            e.status === "pending" && "border-warning/40 bg-warning/5",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-foreground">{formatINR(e.amount)}</div>
            <Badge
              className={cn(
                "capitalize",
                e.status === "approved" && "bg-success text-success-foreground",
                e.status === "rejected" && "bg-destructive text-destructive-foreground",
                e.status === "pending" && "bg-warning text-warning-foreground",
              )}
            >
              {e.status}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{e.reason}</div>
          {e.image_paths.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {e.image_paths.map((p) => (
                <a
                  key={p}
                  href={publicProofUrl(p)}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-16 w-16 overflow-hidden rounded border"
                >
                  <img
                    src={publicProofUrl(p)}
                    alt="proof"
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          {isCustomer && e.status === "pending" && (
            <div className="mt-3 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => decide(e.id, "rejected")}
                disabled={busy === e.id}
              >
                Reject
              </Button>
              <Button size="sm" onClick={() => decide(e.id, "approved")} disabled={busy === e.id}>
                Approve
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
