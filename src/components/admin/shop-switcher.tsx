import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import type { ShopLink } from "@/domain/access/access";
import { adminHref } from "./nav";

/**
 * Shop name + monogram; a dropdown (no JS: <details>) when the user can
 * reach more than one shop. Operators also get "All shops".
 */
export function ShopSwitcher({ current, shops, isOperator }: { current: { name: string; slug: string; mark: string }; shops: ShopLink[]; isOperator: boolean }) {
  const brand = (
    <span className="ad-brand">
      <span className="mark" aria-hidden="true">
        {current.mark}
      </span>
      <span>{current.name}</span>
    </span>
  );
  const others = shops.filter((s) => s.slug !== current.slug);
  if (!others.length && !isOperator) return brand;
  return (
    <details className="ad-switcher">
      <summary aria-label={`${current.name}, switch shop`}>
        <span className="ad-switcher-summary">
          {brand}
          <ChevronsUpDown size={16} aria-hidden="true" />
        </span>
      </summary>
      <div className="ad-switcher-menu">
        {shops.map((s) => (
          <Link key={s.slug} href={adminHref(s.slug)} aria-current={s.slug === current.slug ? "true" : undefined}>
            {s.name}
          </Link>
        ))}
        {isOperator && <Link href="/admin/shops">All shops…</Link>}
      </div>
    </details>
  );
}
