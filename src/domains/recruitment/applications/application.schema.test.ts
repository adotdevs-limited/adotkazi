import { describe, expect, it } from "vitest";

import { InvalidResumeFileError, submitApplicationSchema, validateResumeFile } from "./application.schema";

function makeFile(name: string, sizeBytes: number, type: string): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("submitApplicationSchema", () => {
  it("accepts a valid input with a cover note", () => {
    const result = submitApplicationSchema.safeParse({
      organizationSlug: "adotdevs",
      opportunitySlug: "software-engineer",
      coverNote: "I would love to join the team.",
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty cover note as absent", () => {
    const result = submitApplicationSchema.safeParse({
      organizationSlug: "adotdevs",
      opportunitySlug: "software-engineer",
      coverNote: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coverNote).toBeUndefined();
    }
  });

  it("rejects a cover note over 4000 characters", () => {
    const result = submitApplicationSchema.safeParse({
      organizationSlug: "adotdevs",
      opportunitySlug: "software-engineer",
      coverNote: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing organizationSlug", () => {
    const result = submitApplicationSchema.safeParse({
      organizationSlug: "",
      opportunitySlug: "software-engineer",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateResumeFile", () => {
  it("accepts a valid PDF", () => {
    const file = makeFile("resume.pdf", 1024, "application/pdf");
    expect(validateResumeFile(file)).toBe(file);
  });

  it("accepts a valid DOCX by extension when the MIME type is generic", () => {
    const file = makeFile("resume.docx", 1024, "application/octet-stream");
    expect(validateResumeFile(file)).toBe(file);
  });

  it("rejects a missing file", () => {
    expect(() => validateResumeFile(null)).toThrow(InvalidResumeFileError);
  });

  it("rejects an empty file", () => {
    const file = makeFile("resume.pdf", 0, "application/pdf");
    expect(() => validateResumeFile(file)).toThrow(InvalidResumeFileError);
  });

  it("rejects a file over 5MB", () => {
    const file = makeFile("resume.pdf", 5 * 1024 * 1024 + 1, "application/pdf");
    expect(() => validateResumeFile(file)).toThrow(InvalidResumeFileError);
  });

  it("rejects an unsupported file type", () => {
    const file = makeFile("resume.png", 1024, "image/png");
    expect(() => validateResumeFile(file)).toThrow(InvalidResumeFileError);
  });

  it("rejects a non-File value (e.g. a plain string field)", () => {
    expect(() => validateResumeFile("not-a-file")).toThrow(InvalidResumeFileError);
  });
});
