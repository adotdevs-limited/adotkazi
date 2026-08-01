import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseStorageProvider } from "./supabase-storage";

const uploadMock = vi.fn();
const createSignedUrlMock = vi.fn();
const removeMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  createSignedUrl: createSignedUrlMock,
  remove: removeMock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: { from: fromMock },
  })),
}));

describe("SupabaseStorageProvider", () => {
  const provider = new SupabaseStorageProvider({
    url: "https://project.supabase.co",
    serviceRoleKey: "service-role-key",
    bucket: "documents",
  });

  afterEach(() => {
    uploadMock.mockReset();
    createSignedUrlMock.mockReset();
    removeMock.mockReset();
    fromMock.mockClear();
  });

  it("uploads to the organization-scoped documents path", async () => {
    uploadMock.mockResolvedValueOnce({ error: null });

    const result = await provider.upload({
      organizationId: "org_1",
      filename: "resume.pdf",
      data: Buffer.from("test"),
      contentType: "application/pdf",
    });

    expect(fromMock).toHaveBeenCalledWith("documents");
    expect(uploadMock).toHaveBeenCalledWith(
      "organizations/org_1/documents/resume.pdf",
      expect.any(Buffer),
      { contentType: "application/pdf" },
    );
    expect(result).toEqual({ path: "organizations/org_1/documents/resume.pdf" });
  });

  it("throws a descriptive error when upload fails", async () => {
    uploadMock.mockResolvedValueOnce({ error: { message: "bucket not found" } });

    await expect(
      provider.upload({
        organizationId: "org_1",
        filename: "resume.pdf",
        data: Buffer.from("test"),
        contentType: "application/pdf",
      }),
    ).rejects.toThrow("Failed to upload file to Supabase Storage: bucket not found");
  });

  it("creates a signed URL with the requested expiry", async () => {
    createSignedUrlMock.mockResolvedValueOnce({
      data: { signedUrl: "https://signed.example/resume.pdf" },
      error: null,
    });

    const url = await provider.getSignedUrl("organizations/org_1/documents/resume.pdf", 120);

    expect(createSignedUrlMock).toHaveBeenCalledWith(
      "organizations/org_1/documents/resume.pdf",
      120,
    );
    expect(url).toBe("https://signed.example/resume.pdf");
  });

  it("deletes a file by path", async () => {
    removeMock.mockResolvedValueOnce({ error: null });

    await provider.delete("organizations/org_1/documents/resume.pdf");

    expect(removeMock).toHaveBeenCalledWith(["organizations/org_1/documents/resume.pdf"]);
  });
});
