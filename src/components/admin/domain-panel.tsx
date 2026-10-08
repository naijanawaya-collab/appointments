"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { addDomainAction, checkDomainsAction, removeDomainAction, setPrimaryDomainAction } from "@/app/admin/_actions/domains";
import { DOMAIN_STATE_LABEL, type DomainState } from "@/domain/domains/hostname";
import type { DomainStatus } from "@/domain/domains/service";
import { ActionButton, CopyButton, Field, FormStatus, SubmitButton, useFormAction } from "./form-kit";

const PILL: Record<DomainState, string> = { pending: "pill pill-neutral", verifying: "pill pill-neutral", live: "pill pill-success" };
const POLL_MS = 15_000;
const MAX_POLLS = 40; // ~10 minutes, then the owner can press "Check now"

/**
 * Connect a custom domain (MVP-PLAN M4 §10): add → set DNS → we poll until
 * it's live. Works with the Vercel API (automatic) or plain DNS checks.
 */
export function DomainPanel({ businessId, initial, automatic, platformUrl }: { businessId: string; initial: DomainStatus[]; automatic: boolean; platformUrl: string }) {
  const [domains, setDomains] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const polls = useRef(0);
  const form = useForm<{ hostname: string }>({ defaultValues: { hostname: "" } });
  const { submit, status, pending } = useFormAction(form, (v) => addDomainAction(businessId, v), {
    resetOnSuccess: true,
    onSuccess: (d) => {
      polls.current = 0;
      setDomains(d);
    },
  });

  async function check() {
    setChecking(true);
    const r = await checkDomainsAction(businessId);
    setChecking(false);
    if (r.ok) {
      setDomains(r.data);
      setLastError(null);
    } else setLastError(r.error);
  }

  // Re-check every 15 s while anything is still pending (stops after ~10 min).
  const waiting = domains.some((d) => d.state !== "live");
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible" || polls.current >= MAX_POLLS) return;
      polls.current += 1;
      void check();
    }, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- check is stable enough; restart only when waiting flips
  }, [waiting]);

  return (
    <>
      <section className="ad-card" aria-labelledby="dm-current">
        <h2 id="dm-current">Your addresses</h2>
        <p className="ad-card-intro">
          Your shop always works at <a href={platformUrl}>{platformUrl.replace(/^https?:\/\//, "")}</a>. Connect your own domain so customers book at your address.
        </p>
        {domains.length === 0 ? (
          <p className="field-hint">No custom domain yet.</p>
        ) : (
          <>
            <ul className="ad-list">
              {domains.map((d) => (
                <li key={d.id} className="ad-row" style={{ flexWrap: "wrap" }}>
                  <span className="ad-row-main">
                    <span className="ad-row-title">{d.hostname}</span>
                    <span className="ad-row-meta">{d.isPrimary ? "Main address (others redirect here in search results)" : "Also works"}</span>
                  </span>
                  <span className="ad-row-side">
                    <span className={PILL[d.state]} role="status">
                      {DOMAIN_STATE_LABEL[d.state]}
                    </span>
                    {!d.isPrimary && (
                      <ActionButton
                        action={async () => {
                          const r = await setPrimaryDomainAction(businessId, d.id);
                          if (r.ok) setDomains((ds) => ds.map((x) => ({ ...x, isPrimary: x.id === d.id })));
                          return r;
                        }}
                        className="btn btn-link"
                      >
                        Make main
                      </ActionButton>
                    )}
                    <ActionButton
                      action={async () => {
                        const r = await removeDomainAction(businessId, d.id);
                        if (r.ok) await check();
                        return r;
                      }}
                      className="btn btn-link"
                      confirm={`Disconnect ${d.hostname}?`}
                      confirmLabel="Disconnect"
                    >
                      Remove
                    </ActionButton>
                  </span>
                </li>
              ))}
            </ul>
            <div className="ad-form-foot" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={check} disabled={checking}>
                {checking && <span className="spinner" aria-hidden="true" />}
                Check now
              </button>
              {waiting && <span className="field-hint">We check every 15 seconds. DNS changes usually take a few minutes, sometimes up to a few hours.</span>}
              {lastError && <span className="field-error">! {lastError}</span>}
            </div>
          </>
        )}
      </section>

      {domains.some((d) => d.state !== "live") && (
        <section className="ad-card" aria-labelledby="dm-dns">
          <h2 id="dm-dns">Set these DNS records</h2>
          <p className="ad-card-intro">
            At the company where you bought the domain, open its DNS settings and add (or change) these records. Leave your email records (MX, TXT for mail) as they are.
          </p>
          <div className="ad-scroll-x">
            <table className="ad-records">
              <thead>
                <tr>
                  <th scope="col">For</th>
                  <th scope="col">Type</th>
                  <th scope="col">Name</th>
                  <th scope="col">Value</th>
                  <th scope="col">
                    <span className="sr-only">Copy</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {domains
                  .filter((d) => d.state !== "live")
                  .flatMap((d) =>
                    d.records.map((r, i) => (
                      <tr key={`${d.id}-${i}`}>
                        <td>{d.hostname}</td>
                        <td>
                          <code>{r.type}</code>
                        </td>
                        <td>
                          <code>{r.name}</code>
                        </td>
                        <td>
                          <code>{r.value}</code>
                        </td>
                        <td>
                          <CopyButton value={r.value} />
                        </td>
                      </tr>
                    )),
                  )}
              </tbody>
            </table>
          </div>
          <p className="field-hint">If there’s already an A record for “@” or a CNAME for “www”, replace it. Remove AAAA records for “@” if your provider has any.</p>
          {!automatic && (
            <p className="ad-note" style={{ marginTop: 12 }}>
              The platform team also adds your domain to our hosting. If it stays on “Pending DNS” for more than a day after the records are set, contact us.
            </p>
          )}
        </section>
      )}

      <section className="ad-card" aria-labelledby="dm-add">
        <h2 id="dm-add">Connect a domain</h2>
        <p className="ad-card-intro">Use a domain you already own. Buying one takes a few minutes at any registrar.</p>
        <form onSubmit={submit} className="ad-form" noValidate>
          <Field label="Domain" hint="e.g. mbacutzhairstudio.com — we connect both the plain and the www address.">
            {(p) => <input {...p} className="field-input" inputMode="url" autoCapitalize="off" spellCheck={false} placeholder="yourshop.com" {...form.register("hostname")} />}
          </Field>
          <div className="ad-form-foot">
            <SubmitButton pending={pending} className="btn btn-primary" pendingLabel="Connecting…">
              Connect domain
            </SubmitButton>
            <FormStatus status={status} />
          </div>
        </form>
      </section>
    </>
  );
}
