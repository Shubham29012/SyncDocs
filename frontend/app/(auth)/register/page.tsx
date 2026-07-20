"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  registerWithEmail,
  signInWithGoogle,
  signInWithGitHub,
} from "@/lib/firebase-auth";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const validate = () => {
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return false;
    }

    return true;
  };

  const register = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      await registerWithEmail(
        email,
        password
      );

      toast.success(
        "Account created successfully!"
      );

      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const oauth = async (
    provider: "google" | "github"
  ) => {
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }

      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <p className="auth-logo">
          ⚡ SyncDocs
        </p>

        <p className="auth-tagline">
          Create your account
        </p>

        <form onSubmit={register}>

          <div className="form-group">
            <label>Name</label>

            <input
              className="input"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              className="input"
              type="email"
              value={email}
              required
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
              value={password}
              required
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>

            <input
              className="input"
              type="password"
              value={confirm}
              required
              onChange={(e) =>
                setConfirm(e.target.value)
              }
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>

        </form>

        <div className="divider">or</div>

        <button
          className="btn btn-secondary"
          style={{
            width: "100%",
            marginBottom: 12,
          }}
          onClick={() =>
            oauth("google")
          }
        >
          Continue with Google
        </button>

        <button
          className="btn btn-secondary"
          style={{ width: "100%" }}
          onClick={() =>
            oauth("github")
          }
        >
          Continue with GitHub
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
          }}
        >
          Already have an account?{" "}
          <Link href="/login">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}