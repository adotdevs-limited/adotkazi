import { describe, expect, it } from "vitest";

import { createOrganizationSchema } from "./organization.schema";

const validInput = {
  name: "Adotdevs Limited",
  slug: "adotdevs",
  country: "Tanzania",
  timezone: "Africa/Dar_es_Salaam",
};

describe("createOrganizationSchema", () => {
  it("accepts valid input", () => {
    expect(createOrganizationSchema.safeParse(validInput).success).toBe(true);
  });

  it.each(["adot devs", "adot_devs", "-adotdevs", "adotdevs-", "a b"])(
    "rejects invalid slug %s",
    (slug) => {
      const result = createOrganizationSchema.safeParse({ ...validInput, slug });
      expect(result.success).toBe(false);
    },
  );

  it.each(["adotdevs", "adot-devs", "adot123", "123"])("accepts valid slug %s", (slug) => {
    const result = createOrganizationSchema.safeParse({ ...validInput, slug });
    expect(result.success).toBe(true);
  });

  it("lowercases the slug before validating it", () => {
    const result = createOrganizationSchema.safeParse({ ...validInput, slug: "AdotDevs" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("adotdevs");
    }
  });

  it("rejects a name that is too short", () => {
    const result = createOrganizationSchema.safeParse({ ...validInput, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing country", () => {
    const result = createOrganizationSchema.safeParse({ ...validInput, country: "" });
    expect(result.success).toBe(false);
  });
});
