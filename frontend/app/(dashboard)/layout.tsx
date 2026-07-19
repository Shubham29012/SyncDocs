"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: "32px", height: "32px", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="app-layout">
      <Navbar />
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
