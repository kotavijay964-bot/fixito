import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Wrench, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SERVICES } from "@/lib/services";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  fullName: z.string().trim().min(1, "Name required").max(100).optional(),
});

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — FixIt" },
      { name: "description", content: "Sign in or create an account as a customer or service worker." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    if (loading || !user) return;
    if (search.redirect) {
      navigate({ to: search.redirect });
      return;
    }
    navigate({ to: role === "worker" ? "/worker" : "/bookings" });
  }, [loading, user, role, navigate, search.redirect]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-[var(--shadow-lg)]">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to FixIt</CardTitle>
          <CardDescription>One account. Choose your role to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <AuthForm mode="signin" />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <AuthForm mode="signup" />
            </TabsContent>
          </Tabs>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline-offset-4 hover:underline">
              Back home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"user" | "worker">("user");
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (id: string) =>
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      const parsed = authSchema.safeParse({ email, password, fullName });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      if (role === "worker" && categories.length === 0) {
        toast.error("Workers must select at least one service category");
        return;
      }
      setSubmitting(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;

        // If worker, save categories (profile is auto-created by trigger)
        if (role === "worker" && data.user) {
          const rows = categories.map((c) => ({ worker_id: data.user!.id, category: c }));
          const { error: catErr } = await supabase.from("worker_categories").insert(rows);
          if (catErr) console.error("worker_categories insert", catErr);
        }
        toast.success("Account created. You're signed in.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    } else {
      const parsed = authSchema.safeParse({ email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <>
          <div className="space-y-2">
            <Label>I am a</Label>
            <div className="grid grid-cols-2 gap-2">
              <RoleCard
                active={role === "user"}
                onClick={() => setRole("user")}
                icon={<UserIcon className="h-5 w-5" />}
                title="Customer"
                desc="Book services"
              />
              <RoleCard
                active={role === "worker"}
                onClick={() => setRole("worker")}
                icon={<Wrench className="h-5 w-5" />}
                title="Worker"
                desc="Accept jobs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full name</Label>
            <Input
              id="signup-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${mode}-email`}>Email</Label>
        <Input
          id={`${mode}-email`}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input
          id={`${mode}-password`}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
      </div>
      {mode === "signup" && role === "worker" && (
        <div className="space-y-2 rounded-lg border bg-accent/30 p-3">
          <Label className="text-sm">Service categories you handle</Label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border bg-card p-2 text-sm transition",
                  categories.includes(s.id) ? "border-primary" : "border-border",
                )}
              >
                <Checkbox
                  checked={categories.includes(s.id)}
                  onCheckedChange={() => toggleCategory(s.id)}
                />
                <span>
                  {s.emoji} {s.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition",
        active ? "border-primary bg-accent shadow-[var(--shadow-md)]" : "border-border bg-card hover:border-primary/40",
      )}
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {icon}
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
