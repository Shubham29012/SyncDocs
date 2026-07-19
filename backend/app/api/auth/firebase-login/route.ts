/**
 * POST /api/auth/firebase-login
 *
 * Accepts a Firebase ID token, verifies it, finds-or-creates the user
 * in our database, then issues a NextAuth-compatible JWT cookie so the
 * rest of the app (middleware, withAuth, etc.) works without changes.
 *
 * NOTE: Uses `jose` (already a transitive dep) instead of `next-auth/jwt`
 * because next-auth is not installed in this workspace's backend package.
 * The JWT structure matches exactly what next-auth's middleware expects.
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // ── 1. Verify Firebase ID token ──────────────────────────────────────────
    const decoded = await adminAuth.verifyIdToken(idToken);

    const email = decoded.email;
    const name  = decoded.name ?? decoded.email?.split("@")[0] ?? "User";
    const image = decoded.picture ?? null;

    if (!email) {
      return NextResponse.json({ error: "Firebase token has no email" }, { status: 400 });
    }

    // ── 2. Find or create user in our DB ─────────────────────────────────────
    const user = await prisma.user.upsert({
      where:  { email },
      create: { email, name, image, password: null },
      update: { name, image },
      select: { id: true, email: true, name: true, image: true },
    });

    // ── 4. Set session cookie name ──────────────────────────────────────────
    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    // ── 3. Create a NextAuth-compatible JWT using next-auth/jwt encode ─────────
    const maxAgeSec = 30 * 24 * 60 * 60; // 30 days

    const token = await encode({
      token: {
        name:    user.name,
        email:   user.email,
        picture: user.image,
        sub:     user.id,
        id:      user.id,
        image:   user.image,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: maxAgeSec,
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   maxAgeSec,
    });

    return response;
  } catch (err: any) {
    console.error("[firebase-login]", err);

    if (err?.code?.startsWith("auth/")) {
      return NextResponse.json({ error: "Invalid or expired Firebase token" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
