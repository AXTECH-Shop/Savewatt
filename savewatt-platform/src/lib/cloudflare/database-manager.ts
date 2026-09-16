import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export class DatabaseManager {
  static getDatabase(): D1Database {
    const database = getCloudflareContext().env.DB;
    if (!database) {
      throw new Error("D1_BINDING_UNAVAILABLE");
    }
    return database;
  }
}
