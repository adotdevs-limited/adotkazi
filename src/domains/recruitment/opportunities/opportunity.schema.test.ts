import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createOpportunitySchema } from "./opportunity.schema";

const validInput = {
  title: "Senior Software Engineer",
  slug: "senior-software-engineer",
  departmentId: randomUUID(),
  branchId: "",
  pipelineId: "",
  hiringTeamId: "",
  opportunityType: "FULL_TIME",
  workplaceType: "REMOTE",
  experienceLevel: "SENIOR",
  location: "Dar es Salaam",
  openings: "2",
  salaryMin: "",
  salaryMax: "",
  currency: "",
  applicationDeadline: "",
  description: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  visibility: "PUBLIC",
  skills: "TypeScript, React",
};

describe("createOpportunitySchema", () => {
  it("accepts valid input", () => {
    const result = createOpportunitySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("treats empty-string optional fields as absent", () => {
    const result = createOpportunitySchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.branchId).toBeUndefined();
      expect(result.data.salaryMin).toBeUndefined();
      expect(result.data.applicationDeadline).toBeUndefined();
    }
  });

  it("coerces openings to a number", () => {
    const result = createOpportunitySchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openings).toBe(2);
    }
  });

  it("rejects a title that is too short", () => {
    const result = createOpportunitySchema.safeParse({ ...validInput, title: "Ab" });
    expect(result.success).toBe(false);
  });

  it.each(["senior engineer", "senior_engineer", "-senior", "senior-"])(
    "rejects invalid slug %s",
    (slug) => {
      const result = createOpportunitySchema.safeParse({ ...validInput, slug });
      expect(result.success).toBe(false);
    },
  );

  it("rejects a missing departmentId", () => {
    const result = createOpportunitySchema.safeParse({ ...validInput, departmentId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid opportunityType", () => {
    const result = createOpportunitySchema.safeParse({
      ...validInput,
      opportunityType: "FREELANCE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid workplaceType", () => {
    const result = createOpportunitySchema.safeParse({ ...validInput, workplaceType: "MOON" });
    expect(result.success).toBe(false);
  });

  it("defaults openings to 1 when omitted", () => {
    const { openings, ...rest } = validInput;
    void openings;
    const result = createOpportunitySchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openings).toBe(1);
    }
  });

  it("defaults visibility to PUBLIC when omitted", () => {
    const { visibility, ...rest } = validInput;
    void visibility;
    const result = createOpportunitySchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("PUBLIC");
    }
  });

  it("rejects a currency code that is not 3 characters", () => {
    const result = createOpportunitySchema.safeParse({ ...validInput, currency: "USDD" });
    expect(result.success).toBe(false);
  });
});
