"use client";

import { useSyncEngine } from "@/hooks/useSyncEngine";
import { clsx } from "clsx";

const statusConfig = {
  idle:    { dot: "status-online",  label: "Synced",  pulse: false },
  syncing: { dot: "status-syncing", label: "Syncing…",pulse: true  },
  synced:  { dot: "status-online",  label: "Synced",  pulse: false },
  error:   { dot: "status-error",   label: "Sync error", pulse: false },
  offline: { dot: "status-offline", label: "Offline", pulse: false  },
};

export default function SyncStatusBar() {
  const { syncStatus, networkStatus } = useSyncEngine();

  const effectiveStatus = networkStatus === "offline" ? "offline" : syncStatus;
  const config = statusConfig[effectiveStatus] ?? statusConfig.idle;

  return (
    <div
      className="sync-bar"
      title={
        networkStatus === "offline"
          ? "You are offline — edits will sync when reconnected"
          : `Sync status: ${effectiveStatus}`
      }
    >
      <span
        className={clsx("status-dot", config.dot)}
        aria-hidden="true"
      />
      <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
        {config.label}
      </span>
    </div>
  );
}
