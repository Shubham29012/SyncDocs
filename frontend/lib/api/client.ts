/**
 * API client — typed fetch wrapper + TanStack Query helpers
 * Browser:  uses relative /api/* (proxied to backend via next.config.ts rewrites)
 * SSR:      uses absolute NEXT_PUBLIC_BACKEND_URL to reach backend directly
 */

// In the browser, use "" (empty) so requests go to /api/* (proxied).
// In SSR (Node), use the full backend URL.
const BACKEND_URL =
  typeof window !== "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000");

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;


  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data,
      data?.error ?? `HTTP ${response.status}`
    );
  }

  return data as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
};

// ── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => request<{ user: import("@/types").User }>("/api/users/me"),
  updateMe: (body: { name?: string; image?: string | null }) =>
    request<{ user: import("@/types").User }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    request("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Documents ───────────────────────────────────────────────────────────────

export const documentsApi = {
  list: (params?: { filter?: string; limit?: number; offset?: number }) => {
    const qs = params
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : "";
    return request<{ documents: import("@/types").Document[]; total: number }>(
      `/api/documents${qs ? `?${qs}` : ""}`
    );
  },
  create: (body: { title?: string }) =>
    request<{ document: import("@/types").Document }>("/api/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: string) =>
    request<{ document: import("@/types").Document }>(`/api/documents/${id}`),
  update: (id: string, body: { title?: string; isArchived?: boolean }) =>
    request<{ document: import("@/types").Document }>(`/api/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request(`/api/documents/${id}`, { method: "DELETE" }),
  duplicate: (id: string) =>
    request<{ document: import("@/types").Document }>(`/api/documents/${id}/duplicate`, {
      method: "POST",
    }),
  shareLink: (id: string) =>
    request<{ shareToken: string; shareUrl: string }>(`/api/documents/${id}/share-link`),
  revokeShareLink: (id: string) =>
    request(`/api/documents/${id}/share-link`, { method: "DELETE" }),
};

// ── Collaborators ────────────────────────────────────────────────────────────

export const collaboratorsApi = {
  list: (docId: string) =>
    request<{
      owner: import("@/types").User;
      collaborators: import("@/types").CollaboratorEntry[];
    }>(`/api/documents/${docId}/collaborators`),
  invite: (docId: string, body: { email: string; role: "EDITOR" | "VIEWER" }) =>
    request(`/api/documents/${docId}/collaborators`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRole: (
    docId: string,
    userId: string,
    body: { role: "EDITOR" | "VIEWER" }
  ) =>
    request(`/api/documents/${docId}/collaborators/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (docId: string, userId: string) =>
    request(`/api/documents/${docId}/collaborators/${userId}`, {
      method: "DELETE",
    }),
};

// ── Sync ─────────────────────────────────────────────────────────────────────

export const syncApi = {
  push: (body: {
    documentId: string;
    update: string;
    clientId: string;
    timestamp: number;
  }) =>
    request<{ ok: boolean; serverStateSize: number }>("/api/sync/push", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pull: (documentId: string, stateVector?: string) => {
    const qs = new URLSearchParams({ documentId, ...(stateVector ? { stateVector } : {}) });
    return request<{ update: string | null; serverUpdatedAt: string; isEmpty: boolean }>(
      `/api/sync/pull?${qs}`
    );
  },
};

// ── Versions ──────────────────────────────────────────────────────────────────

export const versionsApi = {
  list: (docId: string, params?: { limit?: number; offset?: number }) => {
    const qs = params
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : "";
    return request<{ versions: import("@/types").Version[]; total: number }>(
      `/api/documents/${docId}/versions${qs ? `?${qs}` : ""}`
    );
  },
  create: (docId: string, body: { label?: string }) =>
    request<{ version: import("@/types").Version }>(
      `/api/documents/${docId}/versions`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  get: (docId: string, vId: string) =>
    request<{ version: import("@/types").Version }>(
      `/api/documents/${docId}/versions/${vId}`
    ),
  delete: (docId: string, vId: string) =>
    request(`/api/documents/${docId}/versions/${vId}`, { method: "DELETE" }),
  restore: (docId: string, vId: string) =>
    request(`/api/documents/${docId}/versions/${vId}/restore`, { method: "POST" }),
};

// ── Activity ──────────────────────────────────────────────────────────────────

export const activityApi = {
  list: (docId: string, params?: { limit?: number; offset?: number; action?: string }) => {
    const qs = params
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : "";
    return request<{ logs: import("@/types").ActivityLog[]; total: number }>(
      `/api/documents/${docId}/activity${qs ? `?${qs}` : ""}`
    );
  },
};

// ── Search ────────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (params: {
    q: string;
    type?: "title" | "content" | "all";
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{ results: import("@/types").SearchResult[]; total: number }>(
      `/api/search?${qs}`
    );
  },
};


// ── AI ────────────────────────────────────────────────────────────────────────

type AIAction = "summarize" | "rewrite" | "grammar" | "translate" | "continue" | "meeting-notes";

export const aiApi = {
  run: (
    action: AIAction,
    body: { documentId: string; text: string; targetLanguage?: string }
  ) =>
    request<import("@/types").AIResponse>(`/api/ai/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: { unread?: boolean; limit?: number }) => {
    const qs = params
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : "";
    return request<{
      notifications: import("@/types").Notification[];
      unreadCount: number;
      total: number;
    }>(`/api/notifications${qs ? `?${qs}` : ""}`);
  },
  markRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/api/notifications", { method: "PATCH" }),
  delete: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: "DELETE" }),
};

export { ApiError };
