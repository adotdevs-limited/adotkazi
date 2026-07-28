import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { uuidv7 } from "uuidv7";

import { prisma } from "@/lib/db";
import { env, isGoogleOAuthConfigured } from "@/lib/env";
import { sendEmail } from "@/lib/email/send-email";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      // Keep every table on UUIDv7 primary keys, per SCHEMA_GUIDELINES.md.
      generateId: () => uuidv7(),
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your AdotKazi password",
        body: `Reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your AdotKazi email address",
        body: `Verify your email: ${url}`,
      });
    },
  },
  socialProviders: isGoogleOAuthConfigured
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days ("Remember Me" ceiling, see AUTHENTICATION.md)
    updateAge: 60 * 60 * 8, // refresh session activity every 8h
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      locale: { type: "string", required: false, defaultValue: "en" },
      timezone: { type: "string", required: false, defaultValue: "UTC" },
      preferredTheme: { type: "string", required: false, defaultValue: "system" },
      status: { type: "string", required: false, defaultValue: "pending_verification" },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
