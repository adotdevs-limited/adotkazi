import { describe, expect, it } from "vitest";

import { UnconfiguredSearchProvider } from "./unconfigured-search-provider";

describe("UnconfiguredSearchProvider", () => {
  const provider = new UnconfiguredSearchProvider();
  const notConfiguredMessage =
    "Meilisearch is not configured. Set MEILISEARCH_HOST and MEILISEARCH_API_KEY.";

  it("rejects index", async () => {
    await expect(provider.index("opportunities", [{ id: "opp_1" }])).rejects.toThrow(
      notConfiguredMessage,
    );
  });

  it("rejects search", async () => {
    await expect(provider.search("opportunities", "backend")).rejects.toThrow(notConfiguredMessage);
  });

  it("rejects deleteDocument", async () => {
    await expect(provider.deleteDocument("opportunities", "opp_1")).rejects.toThrow(
      notConfiguredMessage,
    );
  });
});
