export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
