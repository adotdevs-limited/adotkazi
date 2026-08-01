import "server-only";

import { env, isMeilisearchConfigured } from "@/lib/env";
import type { SearchProvider } from "./search-provider";
import { MeilisearchSearchProvider } from "./meilisearch-search-provider";
import { UnconfiguredSearchProvider } from "./unconfigured-search-provider";

export type { SearchOptions, SearchProvider } from "./search-provider";

export const searchProvider: SearchProvider = isMeilisearchConfigured
  ? new MeilisearchSearchProvider({
      host: env.MEILISEARCH_HOST,
      apiKey: env.MEILISEARCH_API_KEY,
    })
  : new UnconfiguredSearchProvider();
