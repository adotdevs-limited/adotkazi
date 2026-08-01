import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { StorageProvider, UploadInput } from "./storage-provider";

export type SupabaseStorageProviderConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

/**
 * Storage path convention (FILE_STORAGE.txt): organizations/{organizationId}/documents/{filename}
 */
export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: SupabaseStorageProviderConfig) {
    this.client = createClient(config.url, config.serviceRoleKey);
    this.bucket = config.bucket;
  }

  async upload(input: UploadInput): Promise<{ path: string }> {
    const path = `organizations/${input.organizationId}/documents/${input.filename}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, input.data, { contentType: input.contentType });

    if (error) {
      throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
    }

    return { path };
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown error"}`);
    }

    return data.signedUrl;
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file from Supabase Storage: ${error.message}`);
    }
  }
}
