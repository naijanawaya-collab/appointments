import Link from "next/link";

/** G-6 and unknown pages inside a shop. Rendered with the shop's theme. */
export default function SiteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-24">
      <h1 className="display text-4xl">This link isn’t valid anymore.</h1>
      <p className="text-muted">The page or booking you’re looking for doesn’t exist, or the link has expired.</p>
      <Link href="/" className="btn btn-primary self-start">
        Go to the homepage
      </Link>
    </main>
  );
}
