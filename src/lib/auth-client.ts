import { createAuthClient } from "better-auth/react";

/** Browser-side auth client. Uses the current origin, so no URL config needed. */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
