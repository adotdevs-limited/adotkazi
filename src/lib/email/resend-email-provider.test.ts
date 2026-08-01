import { afterEach, describe, expect, it, vi } from "vitest";

import { ResendEmailProvider } from "./resend-email-provider";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));

describe("ResendEmailProvider", () => {
  afterEach(() => {
    sendMock.mockReset();
  });

  it("logs to the console and never calls Resend when unconfigured", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = new ResendEmailProvider({ apiKey: "", from: "" });

    await provider.send({ to: "a@b.com", subject: "Hi", body: "Hello" });

    expect(sendMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledOnce();
    logSpy.mockRestore();
  });

  it("sends via Resend with the configured sender when configured", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "email_1" }, error: null });
    const provider = new ResendEmailProvider({ apiKey: "re_test", from: "AdotKazi <a@b.com>" });

    await provider.send({ to: "candidate@example.com", subject: "Welcome", body: "Hi there" });

    expect(sendMock).toHaveBeenCalledWith({
      from: "AdotKazi <a@b.com>",
      to: "candidate@example.com",
      subject: "Welcome",
      text: "Hi there",
    });
  });

  it("throws a descriptive error when Resend returns an error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "invalid api key" } });
    const provider = new ResendEmailProvider({ apiKey: "re_test", from: "AdotKazi <a@b.com>" });

    await expect(
      provider.send({ to: "candidate@example.com", subject: "Welcome", body: "Hi there" }),
    ).rejects.toThrow("Failed to send email via Resend: invalid api key");
  });
});
