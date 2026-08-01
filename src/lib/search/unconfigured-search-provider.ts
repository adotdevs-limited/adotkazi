import type { SearchOptions, SearchProvider } from "./search-provider";

const MESSAGE = "Meilisearch is not configured. Set MEILISEARCH_HOST and MEILISEARCH_API_KEY.";

export class UnconfiguredSearchProvider implements SearchProvider {
  async index<T extends Record<string, unknown>>(
    _indexName: string,
    _documents: T[],
  ): Promise<void> {
    throw new Error(MESSAGE);
  }

  async search<T>(_indexName: string, _query: string, _options?: SearchOptions): Promise<T[]> {
    throw new Error(MESSAGE);
  }

  async deleteDocument(_indexName: string, _documentId: string): Promise<void> {
    throw new Error(MESSAGE);
  }
}
