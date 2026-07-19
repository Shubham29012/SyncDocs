import {
  db,
  getPendingUpdates,
  markUpdateSynced,
  markUpdateFailed,
  clearSyncedUpdates,
  resetFailedUpdates,
  markDocumentSynced,
} from "@/lib/db/dexie";
import { syncApi } from "@/lib/api/client";
import { networkDetector } from "./NetworkDetector";
import type { SyncEngineStatus } from "@/types";

const CLIENT_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const BATCH_SIZE = 50;
const HEARTBEAT_INTERVAL_MS = 30_000; // 30s
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;

type StatusListener = (status: SyncEngineStatus) => void;

export class SyncEngine {
  private _status: SyncEngineStatus = "idle";
  private _listeners = new Set<StatusListener>();
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _isFlushing = false;
  private _failureCount = 0;

  constructor() {
    this._init();
  }

  private _init() {
    if (typeof window === "undefined") return;

    // Flush when coming back online
    networkDetector.subscribe((status) => {
      if (status === "online") {
        this._setStatus("idle");
        this.flush();
      } else {
        this._setStatus("offline");
      }
    });

    // Flush when tab regains focus
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && networkDetector.isOnline) {
        this.flush();
      }
    });

    // Background heartbeat
    this._heartbeatTimer = setInterval(() => {
      if (networkDetector.isOnline) {
        this.flush();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Initial flush
    if (networkDetector.isOnline) {
      this.flush();
    }
  }

  /** Called after every local Yjs update — enqueues to IndexedDB */
  async enqueue(docId: string, update: Uint8Array): Promise<void> {
    const updateBase64 = Buffer.from(update).toString("base64");
    await db.syncQueue.add({
      docId,
      update: updateBase64,
      status: "PENDING",
      retryCount: 0,
      createdAt: Date.now(),
    });

    // Opportunistic flush if online
    if (networkDetector.isOnline) {
      this.flush();
    }
  }

  /** Push all PENDING operations in batches */
  async flush(docId?: string): Promise<void> {
    if (this._isFlushing || !networkDetector.isOnline) return;

    this._isFlushing = true;
    this._setStatus("syncing");

    try {
      const pending = await getPendingUpdates(docId);
      if (pending.length === 0) {
        this._setStatus("synced");
        this._failureCount = 0;
        return;
      }

      // Process in batches of BATCH_SIZE
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        await this._processBatch(batch);
      }

      await clearSyncedUpdates();
      this._setStatus("synced");
      this._failureCount = 0;
    } catch (err) {
      this._failureCount++;
      const backoff = Math.min(
        BASE_BACKOFF_MS * Math.pow(2, this._failureCount - 1),
        MAX_BACKOFF_MS
      );
      console.warn(`[SyncEngine] Flush failed (attempt ${this._failureCount}), retrying in ${backoff}ms`, err);
      this._setStatus("error");

      setTimeout(() => {
        if (networkDetector.isOnline) this.flush();
      }, backoff);
    } finally {
      this._isFlushing = false;
    }
  }

  private async _processBatch(
    batch: Awaited<ReturnType<typeof getPendingUpdates>>
  ): Promise<void> {
    await Promise.all(
      batch.map(async (entry) => {
        try {
          await syncApi.push({
            documentId: entry.docId,
            update: entry.update,
            clientId: CLIENT_ID,
            timestamp: entry.createdAt,
          });
          if (entry.id !== undefined) {
            await markUpdateSynced(entry.id);
          }
        } catch (err: any) {
          // 401/403 = auth error, don't retry
          if (err?.status === 401 || err?.status === 403) {
            if (entry.id !== undefined) {
              await markUpdateFailed(entry.id, "Auth error");
            }
          } else if (err?.status === 413 || err?.status === 400) {
            // Permanently failed — invalid payload
            if (entry.id !== undefined) {
              await markUpdateFailed(entry.id, "Invalid payload");
            }
          } else {
            // Transient error — will retry next flush
            throw err;
          }
        }
      })
    );
  }

  get status(): SyncEngineStatus {
    return this._status;
  }

  subscribe(listener: StatusListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _setStatus(status: SyncEngineStatus) {
    this._status = status;
    this._listeners.forEach((fn) => fn(status));
  }

  destroy() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
    }
  }
}

// Singleton — shared across the entire app
export const syncEngine = new SyncEngine();
