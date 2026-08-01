import { describe, expect, it } from "vitest";

import { UnconfiguredStorageProvider } from "./unconfigured-storage-provider";

describe("UnconfiguredStorageProvider", () => {
  const provider = new UnconfiguredStorageProvider();
  const notConfiguredMessage =
    "Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.";

  it("rejects upload", async () => {
    await expect(
      provider.upload({
        organizationId: "org_1",
        filename: "resume.pdf",
        data: Buffer.from("test"),
        contentType: "application/pdf",
      }),
    ).rejects.toThrow(notConfiguredMessage);
  });

  it("rejects getSignedUrl", async () => {
    await expect(provider.getSignedUrl("some/path")).rejects.toThrow(notConfiguredMessage);
  });

  it("rejects delete", async () => {
    await expect(provider.delete("some/path")).rejects.toThrow(notConfiguredMessage);
  });
});
