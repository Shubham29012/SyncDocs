"use client";

import type { CollaboratorCursor } from "@/types";

interface CollaboratorCursorsProps {
  cursors: CollaboratorCursor[];
}

export default function CollaboratorCursors({ cursors }: CollaboratorCursorsProps) {
  if (cursors.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "70px",
        right: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        zIndex: 20,
      }}
      aria-label="Active collaborators"
    >
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-secondary)",
            border: `1px solid ${cursor.color}33`,
            borderRadius: "20px",
            padding: "4px 12px 4px 4px",
            boxShadow: `0 0 10px ${cursor.color}22`,
            animation: "slideUp 0.2s ease",
          }}
        >
          <div
            className="avatar"
            style={{
              width: "24px",
              height: "24px",
              background: cursor.color,
              border: `2px solid ${cursor.color}`,
              margin: 0,
              fontSize: "0.65rem",
            }}
          >
            {cursor.image ? (
              <img src={cursor.image} alt={cursor.name} />
            ) : (
              cursor.name[0]?.toUpperCase()
            )}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {cursor.name}
          </span>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: cursor.color,
              boxShadow: `0 0 6px ${cursor.color}`,
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        </div>
      ))}
    </div>
  );
}
