"use client";

import { useState, useEffect, useRef } from "react";
import { syncEngine } from "@/features/sync/SyncEngine";
import { networkDetector } from "@/features/sync/NetworkDetector";
import type { SyncEngineStatus, NetworkStatus } from "@/types";

export function useSyncEngine() {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(syncEngine.status);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkDetector.status
  );

  useEffect(() => {
    const unsubSync = syncEngine.subscribe(setSyncStatus);
    const unsubNetwork = networkDetector.subscribe(setNetworkStatus);
    return () => {
      unsubSync();
      unsubNetwork();
    };
  }, []);

  const flush = (docId?: string) => syncEngine.flush(docId);

  return { syncStatus, networkStatus, flush, isOnline: networkStatus === "online" };
}
