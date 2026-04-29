import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FixIt — Smart home services booking" },
      {
        name: "description",
        content:
          "Book trusted home services in minutes. Plumbing, electrical, cleaning and AC repair with transparent pricing in INR.",
      },
      { property: "og:title", content: "FixIt — Smart home services booking" },
      { name: "twitter:title", content: "FixIt — Smart home services booking" },
      { name: "description", content: "Smart Bookings Plus is a web application for managing service bookings with dynamic pricing and real-time updates." },
      { property: "og:description", content: "Smart Bookings Plus is a web application for managing service bookings with dynamic pricing and real-time updates." },
      { name: "twitter:description", content: "Smart Bookings Plus is a web application for managing service bookings with dynamic pricing and real-time updates." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9d82fd22-d759-45b9-a98e-993586fa8aad" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9d82fd22-d759-45b9-a98e-993586fa8aad" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
