import { afterEach, describe, expect, it, vi } from "vitest";

import { MeilisearchSearchProvider } from "./meilisearch-search-provider";

const addDocumentsMock = vi.fn();
const searchMock = vi.fn();
const deleteDocumentMock = vi.fn();
const indexMock = vi.fn(() => ({
  addDocuments: addDocumentsMock,
  search: searchMock,
  deleteDocument: deleteDocumentMock,
}));

vi.mock("meilisearch", () => ({
  Meilisearch: vi.fn().mockImplementation(function Meilisearch() {
    return { index: indexMock };
  }),
}));

describe("MeilisearchSearchProvider", () => {
  const provider = new MeilisearchSearchProvider({
    host: "http://localhost:7700",
    apiKey: "dev-key",
  });

  afterEach(() => {
    addDocumentsMock.mockReset();
    searchMock.mockReset();
    deleteDocumentMock.mockReset();
    indexMock.mockClear();
  });

  it("indexes documents into the named index", async () => {
    const documents = [{ id: "opp_1", title: "Backend Engineer" }];

    await provider.index("opportunities", documents);

    expect(indexMock).toHaveBeenCalledWith("opportunities");
    expect(addDocumentsMock).toHaveBeenCalledWith(documents);
  });

  it("searches and unwraps hits", async () => {
    searchMock.mockResolvedValueOnce({ hits: [{ id: "opp_1", title: "Backend Engineer" }] });

    const results = await provider.search("opportunities", "backend", { limit: 10 });

    expect(indexMock).toHaveBeenCalledWith("opportunities");
    expect(searchMock).toHaveBeenCalledWith("backend", { filter: undefined, limit: 10 });
    expect(results).toEqual([{ id: "opp_1", title: "Backend Engineer" }]);
  });

  it("deletes a document by id", async () => {
    await provider.deleteDocument("opportunities", "opp_1");

    expect(indexMock).toHaveBeenCalledWith("opportunities");
    expect(deleteDocumentMock).toHaveBeenCalledWith("opp_1");
  });
});
