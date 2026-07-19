"use client";

import { useVersionHistory, useRestoreVersion, useDeleteVersion } from "@/hooks/useVersionHistory";
import { formatDistanceToNow, format } from "date-fns";
import type { Version } from "@/types";

interface VersionTimelineProps {
  docId: string;
  isOwner: boolean;
  onViewDiff?: (version: Version) => void;
}

export default function VersionTimeline({ docId, isOwner, onViewDiff }: VersionTimelineProps) {
  const { data, isLoading } = useVersionHistory(docId);
  const restoreVersion = useRestoreVersion(docId);
  const deleteVersion = useDeleteVersion(docId);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "var(--radius)" }} />
        ))}
      </div>
    );
  }

  const versions = data?.versions ?? [];

  if (versions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "40px 0" }}>
        <span className="empty-state-icon" style={{ fontSize: "2rem" }}>🕐</span>
        <p style={{ color: "var(--text-secondary)", fontWeight: "600" }}>No versions yet</p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Create a snapshot to preserve this moment in history
        </p>
      </div>
    );
  }

  return (
    <div className="version-timeline">
      {versions.map((version, idx) => (
        <div key={version.id} className="version-item" id={`version-${version.id}`}>
          <div
            className="version-dot"
            style={idx === 0 ? { background: "var(--accent)", borderColor: "var(--accent-light)" } : undefined}
          />
          <div className="version-content">
            <p className="version-label">
              {version.label ?? "Snapshot"}
              {idx === 0 && (
                <span
                  className="badge badge-editor"
                  style={{ marginLeft: "8px", verticalAlign: "middle" }}
                >
                  Latest
                </span>
              )}
            </p>
            <div className="version-meta">
              <div className="avatar" style={{ width: "18px", height: "18px", margin: 0, fontSize: "0.55rem" }}>
                {version.createdBy.image ? (
                  <img src={version.createdBy.image} alt="" />
                ) : (
                  version.createdBy.name?.[0] ?? "?"
                )}
              </div>
              <span>{version.createdBy.name}</span>
              <span title={format(new Date(version.createdAt), "PPPp")}>
                {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
              </span>
            </div>

            {version.textContent && (
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginTop: "6px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {version.textContent}
              </p>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              {onViewDiff && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onViewDiff(version)}
                >
                  View diff
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (confirm(`Restore document to "${version.label}"? Current state will be auto-saved.`)) {
                        restoreVersion.mutate(version.id);
                      }
                    }}
                    disabled={restoreVersion.isPending}
                  >
                    {restoreVersion.isPending ? (
                      <span className="spinner" style={{ width: "12px", height: "12px" }} />
                    ) : "Restore"}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--rose)" }}
                    onClick={() => {
                      if (confirm("Delete this version?")) {
                        deleteVersion.mutate(version.id);
                      }
                    }}
                    disabled={deleteVersion.isPending}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
