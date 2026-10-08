import type { Instrumentation } from "next";

/**
 * Runs once when a server instance starts. Validates configuration so a
 * misconfigured deployment fails loudly at boot (see src/lib/env.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("./lib/env");
    assertEnv();
  }
}

/**
 * Every unhandled server error, as one structured log line (searchable in
 * Vercel → Logs). Paths only, never query strings: manage links carry tokens.
 * To forward errors to a tracker later (e.g. Sentry), do it here.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as { message?: string; digest?: string; stack?: string };
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      message: error.message ?? String(err),
      digest: error.digest,
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      stack: error.stack?.split("\n").slice(0, 6).join("\n"),
    }),
  );
};
