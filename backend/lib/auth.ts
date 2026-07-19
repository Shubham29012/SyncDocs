import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { LoginSchema } from "@/lib/validations";

// Extend NextAuth Session type to include user.id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // No custom pages — the frontend handles all auth UI.
  // OAuth (Google/GitHub) is handled by Firebase Auth (see frontend/lib/firebase-auth.ts).
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("Invalid credentials format");
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id:       true,
            email:    true,
            name:     true,
            image:    true,
            password: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id    = user.id;
        token.email = user.email;
        token.name  = user.name;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id    = token.id as string;
        session.user.email = token.email as string;
        session.user.name  = token.name  as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      console.log(`[Auth] New user created: ${user.email}`);
    },
  },
};
