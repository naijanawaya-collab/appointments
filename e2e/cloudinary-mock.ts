import { createHash } from "node:crypto";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";

/** Secret the e2e server is started with (playwright.config.ts). */
export const E2E_CLOUDINARY_SECRET = "e2e-cloudinary-secret";

export const TEST_PHOTO = path.join(__dirname, "fixtures", "photo.jpg");

/**
 * Stands in for Cloudinary in the browser: uploads are answered with a
 * response signed exactly like Cloudinary signs it, so the app's real
 * signature + tenant-folder verification runs; delivery URLs return a JPEG.
 */
export async function mockCloudinary(context: BrowserContext, size = { width: 2400, height: 1600 }) {
  let n = 0;
  await context.route("https://api.cloudinary.com/**", async (route) => {
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const folder = body.match(/name="folder"\r\n\r\n([^\r]+)/)?.[1] ?? "unknown";
    const public_id = `${folder}/e2e-${Date.now()}-${++n}`;
    const version = 1_700_000_000 + n;
    const signature = createHash("sha1").update(`public_id=${public_id}&version=${version}${E2E_CLOUDINARY_SECRET}`).digest("hex");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ public_id, version, signature, ...size, bytes: 245_000, format: "jpg" }),
    });
  });
  await context.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", path: TEST_PHOTO }));
}
