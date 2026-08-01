import "server-only";

import { env, isSupabaseStorageConfigured } from "@/lib/env";
import type { StorageProvider } from "./storage-provider";
import { SupabaseStorageProvider } from "./supabase-storage";
import { UnconfiguredStorageProvider } from "./unconfigured-storage-provider";

export type { StorageProvider, UploadInput } from "./storage-provider";

export const storageProvider: StorageProvider = isSupabaseStorageConfigured
  ? new SupabaseStorageProvider({
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: env.SUPABASE_STORAGE_BUCKET,
    })
  : new UnconfiguredStorageProvider();
