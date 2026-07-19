"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [fontSize, setFontSize] = useState("16");
  const [editorWidth, setEditorWidth] = useState("medium");

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") ?? "dark";
    const savedFontSize = localStorage.getItem("editor-font-size") ?? "16";
    const savedWidth = localStorage.getItem("editor-width") ?? "medium";

    setTheme(savedTheme);
    setFontSize(savedFontSize);
    setEditorWidth(savedWidth);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Apply theme
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }

    // Apply other editor preferences
    localStorage.setItem("editor-font-size", fontSize);
    localStorage.setItem("editor-width", editorWidth);

    toast.success("Settings saved successfully!");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px 0" }}>
      <h1 className="page-title">Application Settings</h1>
      <p className="page-subtitle">Personalize your document editor appearance and layout preference</p>

      <form onSubmit={handleSaveSettings} className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Theme Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>Theme Mode</label>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-4px" }}>Choose how SyncDocs looks on your screen</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <label className="glass-card" style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", border: theme === "light" ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
              <input type="radio" name="theme" value="light" checked={theme === "light"} onChange={() => setTheme("light")} />
              <span style={{ fontSize: "0.875rem" }}>Light Mode</span>
            </label>
            <label className="glass-card" style={{ flex: 1, padding: "12px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", border: theme === "dark" ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
              <input type="radio" name="theme" value="dark" checked={theme === "dark"} onChange={() => setTheme("dark")} />
              <span style={{ fontSize: "0.875rem" }}>Dark Mode</span>
            </label>
          </div>
        </div>

        <div className="toolbar-divider" style={{ width: "100%", height: "1px", background: "var(--border)", margin: "8px 0" }} />

        {/* Font Size Preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>Editor Font Size (px)</label>
          <select
            className="input-field"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            style={{ width: "100%", background: "var(--bg-secondary)" }}
          >
            <option value="12">12px (Small)</option>
            <option value="14">14px</option>
            <option value="16">16px (Normal)</option>
            <option value="18">18px</option>
            <option value="20">20px (Large)</option>
            <option value="24">24px (Extra Large)</option>
          </select>
        </div>

        {/* Editor Layout Width */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>Editor Max Width</label>
          <select
            className="input-field"
            value={editorWidth}
            onChange={(e) => setEditorWidth(e.target.value)}
            style={{ width: "100%", background: "var(--bg-secondary)" }}
          >
            <option value="narrow">Narrow (Centered, 600px)</option>
            <option value="medium">Medium (Standard, 800px)</option>
            <option value="wide">Wide (Spacious, 1000px)</option>
            <option value="full">Full Width</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "12px" }}>
          Save Configuration
        </button>
      </form>
    </div>
  );
}
