import { DatabaseSync } from "node:sqlite";

const DB_FILE =
  "/Users/mohankumarv/Desktop/Projects/Clients/AXTECH/Savewatt/savewatt-platform/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9bcc693c3f98806e568fe1f79d371a14b85b2e6051984dec89e77f7e459cc4f6.sqlite";

class D1Stmt {
  constructor(db, sql, params) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new D1Stmt(this.db, this.sql, params);
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.params) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.params) };
  }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: result };
  }
}

export class D1Shim {
  constructor(path = DB_FILE) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA foreign_keys = ON");
  }
  prepare(sql) {
    return new D1Stmt(this.db, sql, []);
  }
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

/** Minimal in-memory R2Bucket fake for tests. */
export function fakeR2() {
  const store = new Map();
  return {
    store,
    async get(key) {
      if (!store.has(key)) return null;
      const bytes = store.get(key);
      return { body: new Response(bytes).body, arrayBuffer: async () => bytes.buffer.slice(0) };
    },
    async put(key, value) {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      store.set(key, bytes);
      return { key };
    },
  };
}

/** Minimal Browser Rendering fake: returns a valid PDF header payload. */
export function fakeBrowser(captured = []) {
  return {
    async fetch(_url, init) {
      const body = JSON.parse(init?.body ?? "{}");
      captured.push(body);
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]), {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    },
  };
}
