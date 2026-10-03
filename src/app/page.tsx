import Link from "next/link";

/** Platform landing page (only shown on platform hosts; custom domains go to their storefront). */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-sm uppercase tracking-widest text-muted">Appointments</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Online booking for barbershops.
      </h1>
      <p className="mt-4 text-muted">
        Customers pick services, a professional and a time. Owners manage everything from one
        dashboard.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/book/demo-barber"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          View demo booking page
        </Link>
        <Link href="/admin" className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
          Business login
        </Link>
      </div>
    </main>
  );
}
