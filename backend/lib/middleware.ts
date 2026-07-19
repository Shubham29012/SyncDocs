import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

type RouteContext = { params: Promise<Record<string, string>> | Record<string, string> };

type RouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string>; session: { user: { id: string; email: string; name?: string | null } } }
) => Promise<NextResponse>;

/** Resolve params whether it's a Promise or plain object (Next.js 15+ made it a Promise) */
async function resolveParams(ctx: RouteContext): Promise<Record<string, string>> {
  return (ctx.params instanceof Promise ? await ctx.params : ctx.params) ?? {};
}

/**
 * Read the JWT token from the request directly.
 * Works correctly through Next.js proxy rewrites because it reads
 * from the raw Cookie header, not from the Next.js request context.
 */
async function getSessionFromRequest(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
  });

  console.log("[getSessionFromRequest] Token:", token ? "Found" : "Missing/Invalid", "Cookie header:", req.headers.get("cookie")?.substring(0, 50));

  if (!token?.id || !token?.email) return null;

  return {
    user: {
      id: token.id as string,
      email: token.email as string,
      name: (token.name as string) ?? null,
      image: (token.image as string) ?? null,
    },
  };
}

/**
 * Middleware: Requires authenticated session.
 * Attaches session.user to context.
 */
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: RouteContext) => {
    const session = await getSessionFromRequest(req);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const params = await resolveParams(ctx);
    return handler(req, { params, session: session as any });
  };
}


/**
 * Middleware: Requires authenticated session + minimum role on a document.
 * The document ID is read from params.id.
 *
 * Role hierarchy: OWNER > EDITOR > VIEWER
 */
export function withRole(minimumRole: Role) {
  return function (handler: RouteHandler) {
    return withAuth(async (req, context) => {
      const documentId = context.params.id;
      if (!documentId) {
        return NextResponse.json(
          { error: "Bad Request", message: "Document ID required" },
          { status: 400 }
        );
      }

      const userId = context.session.user.id;

      // Check ownership first (owners have all permissions)
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          isDeleted: false,
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

      if (!document) {
        return NextResponse.json(
          { error: "Not Found", message: "Document not found" },
          { status: 404 }
        );
      }

      // Owner always has full access
      if (document.ownerId === userId) {
        return handler(req, { ...context, params: { ...context.params, _userRole: "OWNER" } });
      }

      // Check collaborator role
      const collaborator = await prisma.collaborator.findUnique({
        where: {
          documentId_userId: {
            documentId,
            userId,
          },
        },
        select: { role: true },
      });

      if (!collaborator) {
        return NextResponse.json(
          { error: "Forbidden", message: "You do not have access to this document" },
          { status: 403 }
        );
      }

      // Role hierarchy check
      const roleOrder: Record<Role, number> = {
        OWNER: 3,
        EDITOR: 2,
        VIEWER: 1,
      };

      if (roleOrder[collaborator.role] < roleOrder[minimumRole]) {
        return NextResponse.json(
          { error: "Forbidden", message: `Requires ${minimumRole} role or higher` },
          { status: 403 }
        );
      }

      return handler(req, {
        ...context,
        params: { ...context.params, _userRole: collaborator.role },
      });
    });
  };
}

/**
 * Middleware: Rate limiter using in-memory token bucket.
 * Protects sync/push endpoint from abuse.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(maxRequests: number, windowMs: number) {
  return function (handler: RouteHandler) {
    return async (req: NextRequest, context: any) => {
      // Dynamically load limit from env to ensure hot-reloading and fresh values
      const envLimit = process.env.SYNC_RATE_LIMIT_RPM
        ? parseInt(process.env.SYNC_RATE_LIMIT_RPM, 10)
        : 1000;
      const dynamicMaxRequests = Math.max(maxRequests, envLimit, 1000);

      const session = await getSessionFromRequest(req);
      const key = session?.user?.id ?? req.headers.get("x-forwarded-for") ?? "anonymous";

      const now = Date.now();
      const entry = rateLimitMap.get(key);

      if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
        if (entry.count > dynamicMaxRequests) {
          return NextResponse.json(
            { error: "Too Many Requests", message: "Rate limit exceeded. Please slow down." },
            {
              status: 429,
              headers: {
                "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
                "X-RateLimit-Limit": String(maxRequests),
                "X-RateLimit-Remaining": "0",
              },
            }
          );
        }
      }

      return handler(req, context);
    };
  };
}

/**
 * Wraps a handler with standardized error handling.
 */
export function withErrorHandler(handler: RouteHandler) {
  return async (req: NextRequest, context: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error("[API Error]", error);

      if (error instanceof Error) {
        return NextResponse.json(
          { error: "Internal Server Error", message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}
