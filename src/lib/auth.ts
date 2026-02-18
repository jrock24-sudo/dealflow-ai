import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Invite Code",
      credentials: {
        inviteCode: { label: "Invite Code", type: "password", placeholder: "Enter your invite code" },
      },
      async authorize(credentials) {
        const validCode = process.env.INVITE_CODE;

        if (!validCode) {
          throw new Error("Server misconfiguration: INVITE_CODE is not set.");
        }

        if (!credentials?.inviteCode || credentials.inviteCode !== validCode) {
          return null;
        }

        // Return a minimal user object — no personal data needed for invite-code auth
        return {
          id: "agent-user",
          name: "Deal Agent",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
