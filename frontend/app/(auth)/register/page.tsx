"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/client";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) e.password = "Password must contain an uppercase letter";
    if (!/[0-9]/.test(password)) e.password = "Password must contain a number";
    if (password !== confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await authApi.register({ name: name.trim(), email, password });
      // Auto sign-in after registration
      await signIn("credentials", { email, password, redirect: false });
      toast.success("Account created! Welcome to SyncDocs 🎉");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.body?.error ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-logo">⚡ SyncDocs</p>
        <p className="auth-tagline">Create your free account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              autoComplete="name"
            />
            {errors.name && <p className="error-msg">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {errors.email && <p className="error-msg">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              placeholder="Min 8 chars, with uppercase & number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {errors.password && <p className="error-msg">{errors.password}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            {errors.confirm && <p className="error-msg">{errors.confirm}</p>}
          </div>

          <button
            id="register-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
            ) : "Create account"}
          </button>
        </form>

        <div className="divider">or</div>

        <button
          id="github-register-btn"
          className="btn btn-secondary"
          style={{ width: "100%", gap: "10px" }}
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-accent)", fontWeight: "600" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
