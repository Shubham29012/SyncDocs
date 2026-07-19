import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { CollaboratorCursor } from "@/types";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

// Color palette for cursor awareness
const CURSOR_COLORS = [
  "#7c3aed", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4",
];

let colorIndex = 0;
function nextColor(): string {
  return CURSOR_COLORS[colorIndex++ % CURSOR_COLORS.length];
}

export interface YjsProviderOptions {
  docId: string;
  userId: string;
  userName: string;
  userImage?: string;
  initialState?: Uint8Array | null; // From IndexedDB
  onUpdate?: (update: Uint8Array) => void;
  onAwarenessChange?: (cursors: CollaboratorCursor[]) => void;
}

export class YjsProvider {
  ydoc: Y.Doc;
  private _provider: WebsocketProvider | null = null;
  private _color: string;
  private _options: YjsProviderOptions;
  private _destroyed = false;

  constructor(options: YjsProviderOptions) {
    this._options = options;
    this._color = nextColor();
    this.ydoc = new Y.Doc();

    // Hydrate from local state if available
    if (options.initialState && options.initialState.length > 0) {
      try {
        Y.applyUpdate(this.ydoc, options.initialState);
      } catch (err) {
        console.warn("[YjsProvider] Failed to apply initial state:", err);
      }
    }

    // Listen for local updates → enqueue for sync
    if (options.onUpdate) {
      this.ydoc.on("update", (update: Uint8Array) => {
        options.onUpdate!(update);
      });
    }

    this._connectWebSocket();
  }

  private _connectWebSocket() {
    try {
      this._provider = new WebsocketProvider(
        WS_URL,
        `doc-${this._options.docId}`,
        this.ydoc,
        { connect: true }
      );

      // Set local awareness state (cursor presence)
      this._provider.awareness.setLocalStateField("user", {
        id: this._options.userId,
        name: this._options.userName,
        image: this._options.userImage ?? null,
        color: this._color,
      });

      // Propagate awareness changes to UI
      if (this._options.onAwarenessChange) {
        this._provider.awareness.on("change", () => {
          const cursors = this._getCursors();
          this._options.onAwarenessChange!(cursors);
        });
      }
    } catch (err) {
      console.warn("[YjsProvider] WebSocket unavailable — operating in offline mode:", err);
      this._provider = null;
    }
  }

  private _getCursors(): CollaboratorCursor[] {
    if (!this._provider) return [];

    const states = this._provider.awareness.getStates();
    const cursors: CollaboratorCursor[] = [];

    states.forEach((state, clientId) => {
      if (
        state?.user &&
        clientId !== this.ydoc.clientID
      ) {
        cursors.push({
          userId: state.user.id,
          name: state.user.name ?? "Anonymous",
          color: state.user.color ?? "#7c3aed",
          image: state.user.image ?? undefined,
        });
      }
    });

    return cursors;
  }

  get isConnected(): boolean {
    return this._provider?.wsconnected ?? false;
  }

  get provider() {
    return this._provider;
  }

  get color(): string {
    return this._color;
  }

  get awareness() {
    return this._provider?.awareness ?? null;
  }

  applyServerUpdate(updateBase64: string) {
    try {
      const update = new Uint8Array(Buffer.from(updateBase64, "base64"));
      Y.applyUpdate(this.ydoc, update);
    } catch (err) {
      console.error("[YjsProvider] Failed to apply server update:", err);
    }
  }

  getStateVector(): string {
    const sv = Y.encodeStateVector(this.ydoc);
    return Buffer.from(sv).toString("base64");
  }

  getFullState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._provider?.destroy();
    this.ydoc.destroy();
  }
}
