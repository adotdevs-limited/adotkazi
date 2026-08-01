export type UploadInput = {
  organizationId: string;
  filename: string;
  data: Buffer;
  contentType: string;
};

export interface StorageProvider {
  upload(input: UploadInput): Promise<{ path: string }>;
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;
  delete(path: string): Promise<void>;
}
