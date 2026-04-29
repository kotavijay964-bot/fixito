import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function SiteHeader() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const isWorker = role === "worker";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <span className="text-sm font-bold">FX</span>
          </div>
          <span className="text-base">FixIt</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {!isWorker && (
            <Link
              to="/booking"
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
            >
              Book
            </Link>
          )}
          {user && !isWorker && (
            <Link
              to="/bookings"
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
            >
              My Bookings
            </Link>
          )}
          {user && isWorker && (
            <Link
              to="/worker"
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
            >
              Worker Dashboard
            </Link>
          )}
          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                {role && (
                  <Badge variant="outline" className="hidden sm:inline-flex capitalize">
                    {role}
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
                Sign in
              </Button>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
