import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export class DocumentStorageManager {
  static getBucket(): R2Bucket {
    const bucket = getCloudflareContext().env.DOCUMENTS;
    if (!bucket) throw new Error("R2_DOCUMENTS_BINDING_UNAVAILABLE");
    return bucket;
  }
}
