"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import {
  loginWithEmail,
  signInWithGoogle,
  signInWithGitHub,
} from "@/lib/firebase-auth";

/**
 * Exchange a Firebase ID token for a NextAuth session cookie.
 * The backend verifies the token and sets `next-auth.session-token`
 * so the middleware + dashboard layout recognise the user as logged in.
 *
 * NOTE: Uses a relative URL (/api/…) so the request goes through the
 * Next.js rewrite proxy (frontend→backend). This means the browser
 * stores the Set-Cookie on localhost:3001 — the same origin the
 * middleware reads — instead of the backend's localhost:3000.
 */
async function exchangeFirebaseToken(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/firebase-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Session exchange failed");
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<
    "google" | "github" | null
  >(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const credential = await loginWithEmail(email, password);
      const idToken = await credential.user.getIdToken();
      await exchangeFirebaseToken(idToken);

      toast.success("Welcome back!");

      router.push(callbackUrl);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (
    provider: "google" | "github"
  ) => {
    setOauthLoading(provider);

    try {
      const credential =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithGitHub();

      const idToken = await credential.user.getIdToken();
      await exchangeFirebaseToken(idToken);

      toast.success("Login successful!");

      router.push(callbackUrl);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <p className="auth-logo">⚡ SyncDocs</p>

        <p className="auth-tagline">
          Sign in to continue writing
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Email</label>

            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading || !!oauthLoading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="divider">or</div>

        <button
          className="btn btn-secondary"
          style={{ width: "100%", marginBottom: 12 }}
          disabled={!!oauthLoading}
          onClick={() =>
            handleOAuth("google")
          }
        >
          {oauthLoading === "google"
            ? "Loading..."
            : "Continue with Google"}
        </button>

        <button
          className="btn btn-secondary"
          style={{ width: "100%" }}
          disabled={!!oauthLoading}
          onClick={() =>
            handleOAuth("github")
          }
        >
          {oauthLoading === "github"
            ? "Loading..."
            : "Continue with GitHub"}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
          }}
        >
          Don't have an account?{" "}
          <Link href="/register">
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-logo">⚡ SyncDocs</p>
          <p className="auth-tagline">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}