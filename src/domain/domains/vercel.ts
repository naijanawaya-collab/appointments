/**
 * Minimal Vercel Domains API client (project domains + DNS config).
 * `fetch` is injectable so tests never hit the network.
 *
 * Env: VERCEL_TOKEN (scoped to the team), VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional).
 */
import type { DnsRecord } from "./hostname";

export type VercelDomain = {
  name: string;
  verified: boolean;
  /** TXT records Vercel wants when the domain is claimed elsewhere. */
  verification: DnsRecord[];
};

export type VercelClient = {
  addDomain(name: string): Promise<VercelDomain>;
  getDomain(name: string): Promise<VercelDomain | null>;
  verifyDomain(name: string): Promise<VercelDomain | null>;
  isMisconfigured(name: string): Promise<boolean>;
  removeDomain(name: string): Promise<void>;
};

type Options = { token: string; projectId: string; teamId?: string; fetch?: typeof fetch };

export class VercelApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

type RawDomain = { name: string; verified: boolean; verification?: { type: string; domain: string; value: string }[] };

const toDomain = (raw: RawDomain): VercelDomain => ({
  name: raw.name,
  verified: Boolean(raw.verified),
  verification: (raw.verification ?? []).map((v) => ({ type: v.type.toUpperCase() as DnsRecord["type"], name: v.domain, value: v.value })),
});

export function createVercelClient({ token, projectId, teamId, fetch: f = fetch }: Options): VercelClient {
  const project = encodeURIComponent(projectId);
  async function call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const url = new URL(`https://api.vercel.com${path}`);
    if (teamId) url.searchParams.set("teamId", teamId);
    const res = await f(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.status === 404) return null;
    const json = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & T;
    if (!res.ok) throw new VercelApiError(res.status, json.error?.code ?? "unknown", json.error?.message ?? `Vercel API ${res.status}`);
    return json;
  }
  const domainPath = (name: string) => `/v9/projects/${project}/domains/${encodeURIComponent(name)}`;

  return {
    async addDomain(name) {
      try {
        return toDomain((await call<RawDomain>("POST", `/v10/projects/${project}/domains`, { name }))!);
      } catch (err) {
        // Already on this project (e.g. a retry): fetch it instead.
        if (err instanceof VercelApiError && err.status === 409) {
          const existing = await call<RawDomain>("GET", domainPath(name));
          if (existing) return toDomain(existing);
        }
        throw err;
      }
    },
    async getDomain(name) {
      const raw = await call<RawDomain>("GET", domainPath(name));
      return raw ? toDomain(raw) : null;
    },
    async verifyDomain(name) {
      try {
        const raw = await call<RawDomain>("POST", `${domainPath(name)}/verify`);
        return raw ? toDomain(raw) : null;
      } catch (err) {
        if (err instanceof VercelApiError && err.status === 400) return this.getDomain(name); // not verifiable yet
        throw err;
      }
    },
    async isMisconfigured(name) {
      const raw = await call<{ misconfigured: boolean }>("GET", `/v6/domains/${encodeURIComponent(name)}/config`);
      return raw?.misconfigured ?? true;
    },
    async removeDomain(name) {
      await call("DELETE", domainPath(name));
    },
  };
}

export function vercelFromEnv(env: NodeJS.ProcessEnv = process.env): VercelClient | null {
  const token = env.VERCEL_TOKEN;
  const projectId = env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return createVercelClient({ token, projectId, teamId: env.VERCEL_TEAM_ID || undefined });
}
