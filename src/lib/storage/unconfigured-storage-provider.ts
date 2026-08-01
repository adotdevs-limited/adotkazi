import type { StorageProvider, UploadInput } from "./storage-provider";

const MESSAGE =
  "Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.";

export class UnconfiguredStorageProvider implements StorageProvider {
  async upload(_input: UploadInput): Promise<{ path: string }> {
    throw new Error(MESSAGE);
  }

  async getSignedUrl(_path: string, _expiresInSeconds?: number): Promise<string> {
    throw new Error(MESSAGE);
  }

  async delete(_path: string): Promise<void> {
    throw new Error(MESSAGE);
  }
}
