import "server-only";

import { env } from "@/lib/env";
import type { EmailProvider, SendEmailInput } from "./email-provider";
import { ResendEmailProvider } from "./resend-email-provider";

export type { SendEmailInput } from "./email-provider";

export const emailProvider: EmailProvider = new ResendEmailProvider({
  apiKey: env.RESEND_API_KEY,
  from: env.EMAIL_FROM,
});

export async function sendEmail(input: SendEmailInput): Promise<void> {
  return emailProvider.send(input);
}
