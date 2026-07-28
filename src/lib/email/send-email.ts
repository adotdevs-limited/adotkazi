import "server-only";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Placeholder EmailProvider (see NOTIFICATIONS_SYSTEM.txt). Logs to the
 * server console instead of delivering mail. Replace with a Resend-backed
 * implementation when the Communication/Notification infrastructure
 * milestone ships — nothing outside this module should need to change.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  console.log(`[email:dev-stub] to=${input.to} subject="${input.subject}"\n${input.body}`);
}
