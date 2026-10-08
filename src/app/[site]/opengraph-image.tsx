import { ImageResponse } from "next/og";
import { sizedUrl } from "@/domain/media/image";
import { tokensFor } from "@/domain/theme/render";
import { loadSite } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Shop preview";

/** Fetches the hero photo up front so a slow/missing image never breaks the share card. */
async function heroDataUrl(src: string | undefined): Promise<string | null> {
  if (!src) return null;
  try {
    const res = await fetch(sizedUrl(src, 1200, "jpg"), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Generated social share image (BEHAVIOUR §7, editor board 4c):
 * hero photo + shop name + tagline + accent "Book online" button.
 */
export default async function OpenGraphImage(props: { params: Promise<{ site: string }> }) {
  const { site } = await props.params;
  const { storefront: sf } = await loadSite(site);
  const t = tokensFor(sf.config, "dark");
  const heroId = sf.config.hero.mediaIds[0];
  const photo = await heroDataUrl(heroId ? sf.media[heroId]?.src : undefined);
  const name = sf.business.shortName || sf.business.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: t["--background"],
          color: t["--foreground"],
          fontFamily: "sans-serif",
        }}
      >
        {photo && (
          <img src={photo} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: photo ? "linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.25) 60%, rgba(0,0,0,.1))" : "transparent",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 64, gap: 20, width: "100%" }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1, color: photo ? "#ffffff" : t["--foreground"] }}>{name}</div>
          {sf.business.tagline && (
            <div style={{ fontSize: 34, lineHeight: 1.3, maxWidth: 900, color: photo ? "#f1f1ef" : t["--muted"] }}>{sf.business.tagline}</div>
          )}
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "16px 28px",
                fontSize: 28,
                fontWeight: 700,
                background: t["--accent"],
                color: t["--accent-foreground"],
                borderRadius: 8,
              }}
            >
              Book online
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
