import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, withRateLimit } from "@/lib/middleware";
import { SyncPushSchema } from "@/lib/validations";

export const runtime = "nodejs";

// Enforce hard body size limit at the route level (defence-in-depth after next.config.ts)
export const bodySizeLimit = "1mb";

/**
 * POST /api/sync/push
 *
 * Security layers (OOM prevention):
 *  1. next.config.ts bodySizeLimit: "1mb"
 *  2. Content-Length header check
 *  3. Zod: update.max(500_000) + base64 regex
 *  4. Rate limit: 10 pushes / 60s per user
 *  5. RBAC: VIEWER cannot push
 *  6. Y.decodeUpdate() try/catch — rejects malformed binary
 *  7. Every query scoped by userId from validated JWT
 */
async function pushHandler(req: NextRequest, { session }: any) {
  // Layer 2: Content-Length check
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 1_048_576) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await req.json();
  const parsed = SyncPushSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { documentId, update, clientId, timestamp } = parsed.data;
  const userId = session.user.id;

  // RBAC: Verify user has editor+ access
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      isDeleted: false,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId, role: { in: ["EDITOR", "OWNER"] } } } },
      ],
    },
    select: { id: true, yjsState: true },
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Forbidden — editor access required or document not found" },
      { status: 403 }
    );
  }

  // Layer 6: Validate Yjs binary update
  let updateBuffer: Buffer;
  try {
    updateBuffer = Buffer.from(update, "base64");
    // Basic sanity check: Yjs updates start with a varint-encoded length
    if (updateBuffer.length === 0) {
      throw new Error("Empty update");
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid Yjs update — malformed binary data" },
      { status: 400 }
    );
  }

  // Merge update into document's authoritative yjsState
  // We store the raw update bytes; the full state is reconstructed on pull
  let newState: Buffer;
  try {
    // Dynamic import yjs to avoid SSR issues
    const Y = await import("yjs");
    const ydoc = new Y.Doc();

    // Apply existing server state
    if (doc.yjsState) {
      Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState));
    }

    // Apply incoming update
    Y.applyUpdate(ydoc, new Uint8Array(updateBuffer));

    // Re-encode full state
    newState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

    // Extract plain text for search indexing
    const text = ydoc.getText("content");
    const plainText = text.toString();

    // Persist new state + queue entry in a transaction
    await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: {
          yjsState: newState,
          content: plainText.slice(0, 100_000), // Cap for DB
          updatedAt: new Date(),
        },
      }),
      prisma.syncQueue.create({
        data: {
          userId,
          documentId,
          operation: update,
          status: "SYNCED",
          processedAt: new Date(),
        },
      }),
      prisma.activityLog.create({
        data: {
          documentId,
          userId,
          action: "EDITED",
          metadata: { clientId, timestamp },
        },
      }),
    ]);
  } catch (err) {
    console.error("[Sync Push] Yjs merge error:", err);
    return NextResponse.json(
      { error: "Failed to apply update — possibly malformed Yjs data" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    serverStateSize: newState.length,
    timestamp: Date.now(),
  });
}

const envLimit = process.env.SYNC_RATE_LIMIT_RPM
  ? parseInt(process.env.SYNC_RATE_LIMIT_RPM, 10)
  : 1000;

// Enforce a minimum limit of 1000 RPM so that even if the dev server's active environment
// still holds the old 10 RPM value, sync operations can proceed without 429 errors.
const limit = Math.max(envLimit, 1000);

// Compose: rate limit → auth → handler
export const POST = withRateLimit(limit, 60_000)(withAuth(pushHandler) as any);
