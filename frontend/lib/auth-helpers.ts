/**
 * Auth helpers for cross-origin auth flows.
 *
 * WHY: next-auth's signIn("github") / signIn("google") / signOut() use fetch()
 * internally. When the response is a cross-origin redirect (e.g. proxy at 3001
 * redirecting to backend at 3000, which redirects to Google), the browser blocks
 * it as a CORS violation.
 *
 * FIX: Use window.location.href for OAuth + signOut — these are full-page
 * navigations and are NOT subject to CORS.
 * Only credentials login stays as fetch (because it uses redirect:false).
 */

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const FRONTEND = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";

/** Navigate browser to GitHub OAuth flow (full-page, no CORS issue) */
export function signInWithGitHub(callbackUrl = "/dashboard") {
  const cb = encodeURIComponent(`${FRONTEND}${callbackUrl}`);
  window.location.href = `${BACKEND}/api/auth/signin/github?callbackUrl=${cb}`;
}

/** Navigate browser to Google OAuth flow (full-page, no CORS issue) */
export function signInWithGoogle(callbackUrl = "/dashboard") {
  const cb = encodeURIComponent(`${FRONTEND}${callbackUrl}`);
  window.location.href = `${BACKEND}/api/auth/signin/google?callbackUrl=${cb}`;
}

/** Navigate browser to backend signout, then back to frontend login (full-page, no CORS) */
export function signOutUser() {
  const cb = encodeURIComponent(`${FRONTEND}/login`);
  window.location.href = `${BACKEND}/api/auth/signout?callbackUrl=${cb}`;
}
