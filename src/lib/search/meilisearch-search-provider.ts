import "server-only";
import { Meilisearch } from "meilisearch";

import type { SearchOptions, SearchProvider } from "./search-provider";

export type MeilisearchSearchProviderConfig = {
  host: string;
  apiKey: string;
};

export class MeilisearchSearchProvider implements SearchProvider {
  private readonly client: Meilisearch;

  constructor(config: MeilisearchSearchProviderConfig) {
    this.client = new Meilisearch({ host: config.host, apiKey: config.apiKey });
  }

  async index<T extends Record<string, unknown>>(indexName: string, documents: T[]): Promise<void> {
    await this.client.index(indexName).addDocuments(documents);
  }

  async search<T>(indexName: string, query: string, options?: SearchOptions): Promise<T[]> {
    const result = await this.client.index(indexName).search<Record<string, unknown>>(query, {
      filter: options?.filter,
      limit: options?.limit,
    });

    return result.hits as T[];
  }

  async deleteDocument(indexName: string, documentId: string): Promise<void> {
    await this.client.index(indexName).deleteDocument(documentId);
  }
}
