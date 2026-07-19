"use client";

import { useMemo } from "react";
import { diffWords } from "diff";
import type { Version } from "@/types";

interface VersionDiffProps {
  currentText: string;
  version: Version;
  onClose: () => void;
}

export default function VersionDiff({ currentText, version, onClose }: VersionDiffProps) {
  const versionText = version.textContent ?? "";

  const diffs = useMemo(() => {
    return diffWords(versionText, currentText);
  }, [versionText, currentText]);

  const added = diffs.filter((d) => d.added).reduce((n, d) => n + (d.count ?? 0), 0);
  const removed = diffs.filter((d) => d.removed).reduce((n, d) => n + (d.count ?? 0), 0);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={{ maxWidth: "760px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 className="modal-title">Version Diff</h2>
            <div style={{ display: "flex", gap: "12px", fontSize: "0.78rem", marginTop: "4px" }}>
              <span style={{ color: "var(--emerald)" }}>+{added} added</span>
              <span style={{ color: "var(--rose)" }}>−{removed} removed</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close diff">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <span style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 8px" }}>
            📁 Version: {version.label}
          </span>
          <span>→</span>
          <span style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 8px" }}>
            📄 Current
          </span>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--bg-deep)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "20px",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.82rem",
            lineHeight: "1.8",
            color: "var(--text-primary)",
          }}
        >
          {diffs.map((part, i) => {
            if (part.added) {
              return (
                <mark
                  key={i}
                  style={{
                    background: "rgba(16,185,129,0.2)",
                    color: "var(--emerald)",
                    borderBottom: "2px solid var(--emerald)",
                    padding: "0 2px",
                    borderRadius: "2px",
                  }}
                >
                  {part.value}
                </mark>
              );
            }
            if (part.removed) {
              return (
                <del
                  key={i}
                  style={{
                    background: "rgba(244,63,94,0.15)",
                    color: "var(--rose)",
                    textDecoration: "line-through",
                    padding: "0 2px",
                    borderRadius: "2px",
                  }}
                >
                  {part.value}
                </del>
              );
            }
            return <span key={i}>{part.value}</span>;
          })}
        </div>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
