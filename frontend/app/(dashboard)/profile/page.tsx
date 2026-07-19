"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usersApi } from "@/lib/api/client";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setImage(session.user.image ?? "");
    }
  }, [session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      await usersApi.updateMe({ name, image: image || null });
      await updateSession({ name, image });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPwLoading(true);
    try {
      await usersApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px 0" }}>
      <h1 className="page-title">User Profile</h1>
      <p className="page-subtitle">Manage your personal information and security settings</p>

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="glass-card" style={{ padding: "24px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "8px" }}>
          Profile Information
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Name</label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            disabled={loading}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Avatar Image URL</label>
          <input
            type="url"
            className="input-field"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "8px" }} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handlePasswordChange} className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "8px" }}>
          Change Password
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Current Password</label>
          <input
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            disabled={pwLoading}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>New Password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            disabled={pwLoading}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Confirm New Password</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={pwLoading}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "8px" }} disabled={pwLoading}>
          {pwLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
