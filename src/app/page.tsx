import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RevealRoot } from "@/components/landing/reveal-root";
import { PLATFORM_NAME, PLATFORM_OPERATOR, PLATFORM_URL, requestAccessHref } from "@/lib/platform";
import "@/styles/landing.css";

export const metadata: Metadata = {
  title: { absolute: `${PLATFORM_NAME} – Your shop, your look. Booked in a minute.` },
  description: "A storefront that looks like your brand, not a template, and a booking flow your customers already know how to use.",
  alternates: { canonical: PLATFORM_URL },
};

/** Captions + images: real renders of the demo storefronts (L-1). */
const EXAMPLES = [
  { slug: "kaiser", src: "/landing/kaiser.webp", caption: "Classic · gentleman’s barber", alt: "Kaiser & Co. storefront on a phone: cream and brass, serif headline", raised: false },
  { slug: "fadelab", src: "/landing/fadelab.webp", caption: "Modern · fade studio", alt: "FADE/LAB storefront on a phone: dark with an orange accent and bold condensed type", raised: true },
  { slug: "lune", src: "/landing/lune.webp", caption: "Soft · nail & beauty", alt: "Lune Nail & Beauty storefront on a phone: rose tones and rounded buttons", raised: false },
];

const STEPS = [
  { title: "Pick a look", text: "Start from one of six presets, then set your colour, font, logo and photos. Every colour stays readable automatically." },
  { title: "Add services, team & hours", text: "Prices, durations, who does what, breaks and holidays. Availability is calculated for you." },
  { title: "Share your link", text: "On your own domain or ours. Customers book as guests, no account, and get a link to manage it." },
];

const FEATURES = [
  { title: "Looks like you", text: "Your colours, type, photos and section order. Two shops never look the same." },
  { title: "Fast on any phone", text: "Themes render on the server. No flash, no layout jumps, light on data." },
  { title: "No double bookings", text: "Two customers, one slot: exactly one gets it, the other picks a new time instantly." },
  { title: "Self-serve cancellations", text: "Every email has a manage link. You set how late customers can cancel online." },
  { title: "Your own domain", text: "yourshop.at shows your storefront. Same app, your address." },
  { title: "Accessible by default", text: "AA contrast in light and dark, big tap targets, full keyboard support." },
];

const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as React.CSSProperties;

/**
 * Platform landing (SCREENS §5, screens/ld-*.jpg). Server-rendered with the
 * platform (editorial) theme; light/dark follow the visitor's device.
 * Custom domains never reach this page (the proxy sends them to their shop).
 */
export default function HomePage() {
  const cta = requestAccessHref();
  return (
    <RevealRoot className="ld">
      <header className="ld-header">
        <Link href="/" className="ld-wordmark">
          {PLATFORM_NAME}
        </Link>
        <nav className="ld-nav" aria-label="Main">
          <a href="#examples">Examples</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <Link href="/login">Sign in</Link>
        </nav>
        <a href={cta} className="ld-btn ld-btn-primary ld-btn-sm">
          Open your storefront
        </a>
      </header>

      <main id="main">
        <section className="ld-hero">
          <span className="ld-eyebrow">Online booking for barbershops &amp; salons</span>
          <h1 className="ld-h1" data-rise style={delay(60)}>
            Your shop, your look. Booked in a minute.
          </h1>
          <p className="ld-lead">A storefront that looks like your brand, not a template, and a booking flow your customers already know how to use.</p>
          <div className="ld-actions">
            <a href={cta} className="ld-btn ld-btn-primary">
              Open your storefront
            </a>
            <Link href="/kaiser" className="ld-btn ld-btn-secondary">
              See a live demo
            </Link>
          </div>

          <div id="examples" className="ld-phones">
            {EXAMPLES.map((e, i) => (
              <figure key={e.slug} className="ld-phone" data-raised={e.raised} data-rise style={delay(120 + i * 60)}>
                <Link href={`/${e.slug}`} className="ld-phone-frame" aria-label={`Open the ${e.caption.split(" · ")[1]} demo storefront`}>
                  <Image src={e.src} alt={e.alt} width={390} height={760} sizes="(min-width: 900px) 280px, 46vw" loading="eager" fetchPriority={e.raised ? "high" : "auto"} />
                </Link>
                <figcaption>{e.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="ld-section" aria-labelledby="how">
          <div className="ld-section-head">
            <span id="how" className="ld-eyebrow ld-anchor">
              How it works
            </span>
            <h2 className="ld-h2">Open for bookings this afternoon</h2>
          </div>
          <ol className="ld-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal style={delay(i * 80)}>
                <span className="ld-step-num" aria-hidden>
                  {i + 1}
                </span>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="ld-section ld-band" aria-labelledby="features">
          <div className="ld-section-head">
            <span id="features" className="ld-eyebrow ld-anchor">
              Features
            </span>
            <h2 className="ld-h2">Crafted on the outside, solid underneath</h2>
          </div>
          <ul className="ld-features">
            {FEATURES.map((f, i) => (
              <li key={f.title} data-reveal style={delay((i % 3) * 70)}>
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ld-section ld-closing">
          <h2 className="ld-h2 ld-closing-title">Ready when your first customer is.</h2>
          <a href={cta} className="ld-btn ld-btn-primary">
            Open your storefront
          </a>
        </section>
      </main>

      <footer className="ld-footer">
        <span>
          {PLATFORM_NAME} · {PLATFORM_OPERATOR.city}
        </span>
        <span className="ld-footer-links">
          <Link href="/impressum">Impressum</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/login">Business sign in</Link>
        </span>
      </footer>
    </RevealRoot>
  );
}
