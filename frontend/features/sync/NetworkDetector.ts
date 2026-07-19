"use client";

import { useEffect, useRef, useCallback } from "react";
import type { NetworkStatus } from "@/types";

type NetworkListener = (status: NetworkStatus) => void;

// Global singleton so multiple components share one listener set
const listeners = new Set<NetworkListener>();

let currentStatus: NetworkStatus =
  typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online";

function notifyListeners(status: NetworkStatus) {
  currentStatus = status;
  listeners.forEach((fn) => fn(status));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => notifyListeners("online"));
  window.addEventListener("offline", () => notifyListeners("offline"));
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = [
    currentStatus,
    (s: NetworkStatus) => {
      currentStatus = s;
    },
  ];

  useEffect(() => {
    const update = (s: NetworkStatus) => {
      // Force re-render via a ref trick isn't ideal, so we use a callback ref
      document.dispatchEvent(new CustomEvent("network-status", { detail: s }));
    };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  return currentStatus;
}

// ─── Class-based detector for use outside React ────────────────────────────────

export class NetworkDetector {
  private _status: NetworkStatus;
  private _listeners = new Set<NetworkListener>();

  constructor() {
    this._status =
      typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online";
    this._setupListeners();
  }

  private _setupListeners() {
    if (typeof window === "undefined") return;

    const onOnline = () => this._update("online");
    const onOffline = () => this._update("offline");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  }

  private _update(status: NetworkStatus) {
    if (this._status === status) return;
    this._status = status;
    this._listeners.forEach((fn) => fn(status));
  }

  get status(): NetworkStatus {
    return this._status;
  }

  get isOnline(): boolean {
    return this._status === "online";
  }

  subscribe(listener: NetworkListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

export const networkDetector = new NetworkDetector();
