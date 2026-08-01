import "server-only";
import { Resend } from "resend";

import type { EmailProvider, SendEmailInput } from "./email-provider";

export type ResendEmailProviderConfig = {
  apiKey: string;
  from: string;
};

/**
 * Sends via Resend when apiKey/from are configured; otherwise falls back to
 * logging to the server console so local dev works without a Resend account.
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ResendEmailProviderConfig) {
    this.from = config.from;
    this.resend = config.apiKey && config.from ? new Resend(config.apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.resend) {
      console.log(`[email:dev-stub] to=${input.to} subject="${input.subject}"\n${input.body}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.body,
    });

    if (error) {
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }
  }
}
