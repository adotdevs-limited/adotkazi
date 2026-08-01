export type SearchOptions = {
  filter?: string;
  limit?: number;
};

export interface SearchProvider {
  index<T extends Record<string, unknown>>(indexName: string, documents: T[]): Promise<void>;
  search<T>(indexName: string, query: string, options?: SearchOptions): Promise<T[]>;
  deleteDocument(indexName: string, documentId: string): Promise<void>;
}
