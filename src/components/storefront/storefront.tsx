import { ArrowRight, CalendarX, Mail, MapPin, MessageCircle, Music2, Navigation, Phone, Plus, Star } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";
import Image from "next/image";
import Link from "next/link";
import type { MediaView } from "@/domain/media/image";
import type { StorefrontView } from "@/domain/storefront/view";
import { PLATFORM_NAME, PLATFORM_URL } from "@/lib/platform";
import { Gallery, GalleryHeaderButton } from "./gallery";
import { HeroCarousel } from "./hero-carousel";
import { ScrollToButton, StorefrontShell } from "./shell";
import "@/styles/storefront.css";

type Section = StorefrontView["sections"][number];
const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as React.CSSProperties;

/** The public storefront (SCREENS.md §1). Server-rendered; only small islands are client code. */
export function Storefront({ view: v }: { view: StorefrontView }) {
  return (
    <StorefrontShell
      businessId={v.businessId}
      short={v.short}
      mark={v.mark}
      logo={v.logo}
      nav={v.nav}
      links={v.links}
      phone={v.phone}
      announcement={v.announcement}
    >
      <Hero v={v} />
      {v.sections.map((s) => (
        <SectionView key={s.key} s={s} v={v} />
      ))}
      <Footer v={v} />
      <noscript>
        <p className="sf-gutter py-4 text-sm">Please enable JavaScript to book online.</p>
      </noscript>
    </StorefrontShell>
  );
}

/* ---------------- Hero ---------------- */

function OpenStatus({ status, address }: { status: StorefrontView["status"]; address: string | null }) {
  return (
    <span className="sf-status" data-rise style={delay(320)}>
      <span className="sf-status-open">
        <span className="open-dot" data-open={status.open} aria-hidden />
        <span>
          <strong>{status.strong}</strong> {status.rest}
        </span>
      </span>
      {address && <span>{address}</span>}
    </span>
  );
}

function HeroImage({ img, sizes, className }: { img: MediaView; sizes: string; className?: string }) {
  return (
    <Image
      src={img.src}
      alt={img.alt}
      fill
      loading="eager"
      fetchPriority="high"
      sizes={sizes}
      className={className}
      style={{ objectPosition: img.position }}
    />
  );
}

function Hero({ v }: { v: StorefrontView }) {
  const { layout, slides } = v.hero;
  const servicesBtn = v.hasServices;

  if (layout === "full") {
    return (
      <section id="top" className="sf-hero-full">
        <Image
          data-parallax
          src={slides[0].src}
          alt={slides[0].alt}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="hero-parallax"
          style={{ objectPosition: slides[0].position }}
        />
        <div className="sf-scrim" />
        <div className="sf-hero-full-copy">
          {v.eyebrow && (
            <span className="eyebrow" data-rise>
              {v.eyebrow}
            </span>
          )}
          <h1 className="sf-h1 display" data-rise style={delay(80)}>
            {v.name}
          </h1>
          {v.tagline && (
            <p className="sf-tagline" data-rise style={delay(160)}>
              {v.tagline}
            </p>
          )}
          <div className="sf-actions" data-rise style={delay(240)}>
            <Link href={v.links.book} className="btn btn-primary btn-lg">
              Book now
            </Link>
            {servicesBtn && (
              <ScrollToButton target="sec-services" className="btn btn-lg btn-on-photo">
                Prices
              </ScrollToButton>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "carousel") {
    return (
      <section id="top" className="sf-hero-carousel">
        <HeroCarousel slides={slides} />
        <div className="sf-hero-centered">
          {v.eyebrow && (
            <span className="eyebrow" data-rise>
              {v.eyebrow}
            </span>
          )}
          <h1 className="sf-h1 display" data-rise style={delay(80)}>
            {v.name}
          </h1>
          {v.tagline && (
            <p className="sf-tagline" style={{ ...delay(160), maxWidth: "40ch" }} data-rise>
              {v.tagline}
            </p>
          )}
          <Link href={v.links.book} className="btn btn-primary btn-lg" data-rise style={delay(240)}>
            Book an appointment
          </Link>
        </div>
      </section>
    );
  }

  const copy = (
    <div className="sf-hero-copy">
      {v.eyebrow && (
        <span className="eyebrow" data-rise style={delay(80)}>
          {v.eyebrow}
        </span>
      )}
      <h1 className="sf-h1 display" lang="de" data-rise style={delay(140)}>
        {v.name}
      </h1>
      {v.tagline && (
        <p className="sf-tagline" data-rise style={delay(200)}>
          {v.tagline}
        </p>
      )}
      <div className="sf-actions" data-rise style={delay(260)}>
        <Link href={v.links.book} className="btn btn-primary btn-lg">
          Book an appointment
          <ArrowRight size={18} aria-hidden />
        </Link>
        {servicesBtn && (
          <ScrollToButton target="sec-services" className="btn btn-secondary btn-lg">
            Services &amp; prices
          </ScrollToButton>
        )}
      </div>
      <OpenStatus status={v.status} address={v.address} />
    </div>
  );

  if (layout === "text") {
    return (
      <section id="top" className="sf-hero-text">
        {copy}
      </section>
    );
  }

  return (
    <section id="top" className="sf-hero-split">
      <div className="sf-hero-media" data-rise>
        <HeroImage img={slides[0]} sizes="(min-width: 900px) 50vw, 100vw" />
      </div>
      {copy}
    </section>
  );
}

/* ---------------- Sections ---------------- */

function Heading({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <div className="sf-head">
      <span className="eyebrow" data-reveal>
        {eyebrow}
      </span>
      <h2 id={id} className="h2-display display" data-reveal style={delay(60)}>
        {title}
      </h2>
    </div>
  );
}

function SectionView({ s, v }: { s: Section; v: StorefrontView }) {
  switch (s.key) {
    case "about":
      return (
        <section id="sec-about" className="sf-section sf-about" aria-labelledby="h-about">
          <div className="flex flex-col gap-[18px]">
            <Heading eyebrow="About" title={s.title} id="h-about" />
            <p data-reveal style={delay(120)}>
              {s.text}
            </p>
          </div>
          {s.image && (
            <div className="sf-cover" style={{ aspectRatio: "3 / 2" }} data-reveal>
              <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 900px) 50vw, 100vw" style={{ objectPosition: s.image.position }} />
            </div>
          )}
        </section>
      );

    case "services":
      return (
        <section id="sec-services" className="sf-section sf-stack" aria-labelledby="h-services">
          <div className="sf-head-row">
            <Heading eyebrow="Services & prices" title="What we do" id="h-services" />
            <span className="sf-meta">Prices incl. VAT · Vienna time</span>
          </div>
          <div className="sf-services-grid">
            {s.groups.map((g) => (
              <div key={g.id ?? g.name} className="flex flex-col gap-2.5" data-reveal>
                <h3 className="sf-cat-label">{g.name}</h3>
                <ul className="sf-service-list">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <Link href={it.href} className="sf-service">
                        {it.image && (
                          <span className="sf-service-thumb">
                            <Image src={it.image.src} alt="" fill sizes="56px" style={{ objectFit: "cover", objectPosition: it.image.position }} />
                          </span>
                        )}
                        <span className="sf-service-body">
                          <span className="sf-service-name">{it.name}</span>
                          <span className="sf-meta">{it.meta}</span>
                        </span>
                        <span className="sf-price">{it.price}</span>
                        <Plus size={18} className="sf-plus" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={v.links.book} className="btn btn-primary btn-md">
              Choose services
            </Link>
            {s.more && (
              <Link href={v.links.book} className="btn btn-link">
                See all {s.total} services
              </Link>
            )}
          </div>
        </section>
      );

    case "team":
      return (
        <section id="sec-team" className="sf-section sf-stack" aria-labelledby="h-team">
          <Heading eyebrow="Team" title={s.title} id="h-team" />
          <div className="sf-team-grid">
            {s.people.map((p) => (
              <Link key={p.id} href={p.href} className="sf-person zoom-on-hover" data-reveal style={delay(p.delay)}>
                <span className="sf-portrait">
                  {p.photo ? (
                    <Image src={p.photo.src} alt={p.name} fill sizes="(min-width: 900px) 20vw, 46vw" style={{ objectFit: "cover", objectPosition: p.photo.position }} />
                  ) : (
                    <span className="sf-initial display" aria-hidden>
                      {p.initial}
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <strong>{p.name}</strong>
                  {p.title && <span className="sf-meta">{p.title}</span>}
                </span>
                {p.bio && <span className="sf-bio">{p.bio}</span>}
              </Link>
            ))}
          </div>
        </section>
      );

    case "gallery":
      return (
        <section id="sec-gallery" className="sf-section sf-stack" aria-labelledby="h-gallery">
          <div className="sf-head-row">
            <Heading eyebrow="Gallery" title="The work" id="h-gallery" />
            {s.images.length > 5 && <GalleryHeaderButton count={s.images.length} />}
          </div>
          <Gallery images={s.images} instagram={s.instagram} />
        </section>
      );

    case "reviews":
      return (
        <section id="sec-reviews" className="sf-section sf-reviews" aria-label="Reviews">
          {s.rating && (
            <div className="sf-rating">
              <span className="sf-stars" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </span>
              <span>
                {s.rating.value} on Google · {s.rating.count} reviews
              </span>
            </div>
          )}
          <div className="sf-quotes" role="region" aria-label="Customer reviews" tabIndex={0}>
            {s.items.map((r) => (
              <figure key={r.id} data-reveal>
                <blockquote className="display">“{r.quote}”</blockquote>
                <figcaption>
                  {r.author} · {r.source} review
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      );

    case "visit":
      return (
        <section id="sec-visit" className="sf-section sf-visit" aria-labelledby="h-visit">
          <div className="flex flex-col gap-[18px]">
            <Heading eyebrow="Opening hours" title="Visit us" id="h-visit" />
            <span className="flex items-center gap-2 text-[15px]">
              <span className="open-dot" data-open={s.status.open} aria-hidden />
              <strong className="font-semibold">{s.status.strong}</strong>
              {s.status.open ? (
                <span className="text-muted">· closes {s.status.closesAt}</span>
              ) : (
                s.status.rest && <span className="text-muted">{s.status.rest}</span>
              )}
            </span>
            {s.holiday && (
              <div className="sf-holiday">
                <CalendarX size={18} aria-hidden />
                <span>
                  <strong className="font-semibold">Holiday hours:</strong> {s.holiday}
                </span>
              </div>
            )}
            <dl className="sf-hours">
              {s.hours.map((h) => (
                <div key={h.label} className="contents">
                  <dt data-today={h.today} data-closed={h.closed}>
                    {h.label}
                  </dt>
                  <dd data-today={h.today} data-closed={h.closed}>
                    {h.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-3.5">
            {s.map && (
              <div className="sf-map" data-reveal style={delay(80)}>
                <iframe title={s.map.title} src={s.map.src} loading="lazy" referrerPolicy="no-referrer" />
              </div>
            )}
            {s.address && (
              <span className="sf-address">
                <MapPin size={18} aria-hidden />
                {s.address}
              </span>
            )}
            <div className="sf-chip-row">
              {v.links.directions && (
                <a href={v.links.directions} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  <Navigation size={16} aria-hidden />
                  Directions
                </a>
              )}
              {v.links.tel && (
                <a href={v.links.tel} className="btn btn-secondary tabular">
                  <Phone size={16} aria-hidden />
                  {s.phone}
                </a>
              )}
              {v.links.whatsapp && (
                <a href={v.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  <MessageCircle size={16} aria-hidden />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </section>
      );
  }
}

/* ---------------- Footer ---------------- */

function Footer({ v }: { v: StorefrontView }) {
  const socials = v.showSocials;
  return (
    <footer className="sf-footer">
      <span className="sf-footer-name display">{v.name}</span>
      {socials && (
        <div className="flex flex-wrap gap-2">
          {v.links.instagram && (
            <a href={v.links.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="sf-round">
              <InstagramIcon size={18} aria-hidden />
            </a>
          )}
          {v.links.tiktok && (
            <a href={v.links.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="sf-round">
              <Music2 size={18} aria-hidden />
            </a>
          )}
          {v.links.whatsapp && (
            <a href={v.links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="sf-round">
              <MessageCircle size={18} aria-hidden />
            </a>
          )}
          {v.links.mail && (
            <a href={v.links.mail} className="sf-round" data-wide>
              <Mail size={16} aria-hidden />
              {v.email}
            </a>
          )}
        </div>
      )}
      <div className="sf-footer-legal">
        <span>
          <Link href={v.links.legal}>Impressum</Link> · <Link href={`${v.links.legal}#privacy`}>Privacy</Link>
        </span>
        <a href={PLATFORM_URL} target="_blank" rel="noopener">
          Booking by {PLATFORM_NAME}
        </a>
      </div>
    </footer>
  );
}
