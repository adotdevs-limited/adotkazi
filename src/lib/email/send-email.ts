import "server-only";

import { Resend } from "resend";

import { env, isResendConfigured } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

const resend = isResendConfigured ? new Resend(env.RESEND_API_KEY) : null;

/**
 * EmailProvider (see NOTIFICATIONS_SYSTEM.txt). Sends via Resend when
 * RESEND_API_KEY/EMAIL_FROM are configured; otherwise falls back to logging
 * to the server console so local dev works without a Resend account.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!resend) {
    console.log(`[email:dev-stub] to=${input.to} subject="${input.subject}"\n${input.body}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}
