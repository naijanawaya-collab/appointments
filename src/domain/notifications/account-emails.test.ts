import { describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "@/domain/business/geocode";
import { inviteEmail, resetPasswordEmail } from "./account-emails";

describe("account emails", () => {
  it("invites new users to set a password, escaping names", () => {
    const m = inviteEmail({ shopName: "Mba <Cutz>", inviterName: "Ada", url: "https://app.x.com/reset-password?invite=1&token=abc", role: "owner", hasPassword: false });
    expect(m.subject).toContain("You're invited to Mba <Cutz>");
    expect(m.html).toContain("Mba &lt;Cutz&gt;");
    expect(m.html).not.toContain("<Cutz>");
    expect(m.html).toContain("Set your password");
    expect(m.html).toContain("token=abc");
    expect(m.text).toContain("expires in 24 hours");
  });

  it("existing users just get a sign-in link", () => {
    const m = inviteEmail({ shopName: "Shop", inviterName: null, url: "https://app.x.com/login", role: "staff", hasPassword: true });
    expect(m.html).toContain("Sign in");
    expect(m.text).not.toContain("expires");
  });

  it("reset email names the 1 hour limit", () => {
    const m = resetPasswordEmail({ name: "Anton Kaiser", url: "https://app.x.com/reset-password?token=t" });
    expect(m.html).toContain("Hi Anton");
    expect(m.text).toContain("1 hour");
  });
});

describe("geocodeAddress", () => {
  it("returns the first hit with a descriptive user agent", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify([{ lat: "48.2105", lon: "16.3481", display_name: "Josefstädter Straße 21, Wien" }])),
    );
    const r = await geocodeAddress("Josefstädter Straße 21, 1080 Wien", { fetch: fetchMock as typeof fetch, userAgent: "Appointments/1.0 (ops@x.com)" });
    expect(r).toEqual({ lat: 48.2105, lon: 16.3481, label: "Josefstädter Straße 21, Wien" });
    expect((fetchMock.mock.calls[0][1]!.headers as Record<string, string>)["User-Agent"]).toBe("Appointments/1.0 (ops@x.com)");
  });

  it("null for no match, errors and too-short input", async () => {
    const empty = (async () => new Response("[]")) as typeof fetch;
    expect(await geocodeAddress("Nowhere 1", { fetch: empty, userAgent: "x" })).toBeNull();
    expect(await geocodeAddress("ab", { fetch: empty, userAgent: "x" })).toBeNull();
    expect(await geocodeAddress("Somewhere 1", { fetch: (async () => new Response("", { status: 503 })) as typeof fetch, userAgent: "x" })).toBeNull();
  });
});
