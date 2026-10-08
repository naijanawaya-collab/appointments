import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

const good = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  BETTER_AUTH_SECRET: "x".repeat(44),
  BETTER_AUTH_URL: "https://app.example.com",
  NEXT_PUBLIC_PLATFORM_URL: "https://example.com",
  PLATFORM_HOSTS: "example.com,app.example.com",
  RESEND_API_KEY: "re_123",
  EMAIL_FROM: "Bookings <bookings@mail.example.com>",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "cloud",
  CLOUDINARY_API_KEY: "k",
  CLOUDINARY_API_SECRET: "s",
  VERCEL_TOKEN: "t",
  VERCEL_PROJECT_ID: "prj_1",
  PLATFORM_ADMIN_EMAILS: "me@example.com",
};

describe("checkEnv", () => {
  it("accepts a complete production config", () => {
    expect(checkEnv(good)).toEqual({ errors: [], warnings: [] });
  });

  it("fails production on missing or weak required settings", () => {
    const { errors } = checkEnv({ ...good, BETTER_AUTH_SECRET: "change-me-to-a-long-random-string", DATABASE_URL: undefined, BETTER_AUTH_URL: "app.example.com" });
    expect(errors).toHaveLength(3);
    expect(errors.join(" ")).toMatch(/DATABASE_URL[^]*BETTER_AUTH_SECRET[^]*BETTER_AUTH_URL/);
  });

  it("requires Resend in production unless emails are deliberately printed", () => {
    expect(checkEnv({ ...good, RESEND_API_KEY: undefined }).errors[0]).toMatch(/RESEND_API_KEY/);
    expect(checkEnv({ ...good, RESEND_API_KEY: undefined, EMAIL_FROM: undefined, EMAIL_DRIVER: "console" }).errors).toEqual([]);
  });

  it("only warns about optional integrations", () => {
    const { errors, warnings } = checkEnv({ ...good, CLOUDINARY_API_SECRET: undefined, VERCEL_TOKEN: undefined, PLATFORM_ADMIN_EMAILS: "" });
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(3);
  });

  it("never blocks local development, it only warns", () => {
    const { errors, warnings } = checkEnv({ NODE_ENV: "development" });
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThan(3);
  });
});
