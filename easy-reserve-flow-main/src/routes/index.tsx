import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SERVICES, formatINR } from "@/lib/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FixIt — Book trusted home services in India" },
      {
        name: "description",
        content:
          "Plumbing, electrical, cleaning and AC repair at fair prices. Emergency bookings available 24/7.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[image:var(--gradient-hero)]">
        <div className="container mx-auto px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Trusted technicians • Available 24/7
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Home services,{" "}
              <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                booked smart
              </span>
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Transparent pricing in ₹, instant confirmation, and emergency dispatch when you need
              it most.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/booking">Book a service</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/bookings">My bookings</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pick a service
          </h2>
          <p className="mt-3 text-muted-foreground">
            Fixed base price + transparent per-item charge. No surprises.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link
              key={s.id}
              to="/booking"
              search={{ service: s.id }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
            >
              <div className="text-3xl">{s.emoji}</div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">From</span>
                <span className="text-lg font-bold text-foreground">
                  {formatINR(s.basePrice)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-16 sm:grid-cols-3">
          {[
            { title: "Transparent pricing", body: "See the exact total in ₹ before you confirm." },
            { title: "Emergency dispatch", body: "+25% surcharge for priority same-hour service." },
            { title: "Track bookings", body: "All your bookings, status and history in one place." },
          ].map((f) => (
            <div key={f.title}>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
