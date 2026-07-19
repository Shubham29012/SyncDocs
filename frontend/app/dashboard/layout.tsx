"use client";


import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/app/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Loading state — show spinner while session is being checked
  if (loading) {
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
          <div
            className="spinner"
            style={{ width: "36px", height: "36px", margin: "0 auto 16px" }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to /login
  if (!user) {
    redirect("/login");
  }


  return (
    <div className="app-layout">
      <Navbar />
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
