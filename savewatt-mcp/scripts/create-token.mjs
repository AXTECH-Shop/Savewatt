#!/usr/bin/env node
/**
 * Create an MCP API token (PAT or SERVICE) in the shared D1 database.
 * The plaintext token is printed ONCE — only its SHA-256 hash is stored.
 *
 * Usage (from savewatt-mcp/):
 *   node scripts/create-token.mjs --email contact@savewatt.fr --org org_savewatt \
 *     --scopes "*" [--kind PAT] [--label "ops-cli"] [--expires-days 90] [--remote]
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg, index, all) => {
    if (!arg.startsWith("--")) return [];
    return [arg.slice(2), all[index + 1] && !all[index + 1].startsWith("--") ? all[index + 1] : "true"];
  }),
);

const email = args.email;
const org = args.org;
if (!email || !org) {
  console.error("required: --email <owner email> --org <organization id>");
  process.exit(1);
}
const kind = args.kind === "SERVICE" ? "SERVICE" : "PAT";
const label = String(args.label ?? "mcp-token").slice(0, 120);
const scopesRaw = String(args.scopes ?? "*");
// Normalize to a JSON array ("*" or "a,b" → '["*"]' / '["a","b"]').
const scopes = JSON.stringify(scopesRaw.split(",").map((s) => s.trim()).filter(Boolean));
const remote = args.remote === "true" || args.remote === "";
const expiresDays = Number(args["expires-days"] ?? 0);
const db = args.db ?? "savewatt";

const plaintext = `swm_${randomBytes(32).toString("base64url")}`;
const tokenHash = createHash("sha256").update(plaintext).digest("hex");
const id = randomUUID();
const expiresAt = expiresDays > 0 ? Math.floor(Date.now() / 1000) + expiresDays * 86400 : null;

const sql = `
INSERT INTO api_tokens (
  id, token_hash, kind, label, owner_user_id, organization_id, scopes_json,
  status, expires_at, created_at
)
SELECT '${id}', '${tokenHash}', '${kind}', '${label.replaceAll("'", "''")}', owner.id, org.id,
       '${scopes.replaceAll("'", "''")}', 'ACTIVE', ${expiresAt === null ? "NULL" : expiresAt}, unixepoch()
FROM users owner, organizations org
WHERE owner.email = '${email.replaceAll("'", "''")}' AND org.id = '${org.replaceAll("'", "''")}';
SELECT (SELECT changes() ) AS inserted;
`;

const wranglerArgs = [
  "wrangler",
  "d1",
  "execute",
  db,
  remote ? "--remote" : "--local",
  `--command=${sql}`,
];
try {
  const output = execFileSync("npx", wranglerArgs, {
    cwd: new URL("..", import.meta.url).pathname,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!output.includes('"inserted": 1') && !output.includes("inserted")) {
    // wrangler prints results table; check for success marker
    if (!/success/i.test(output)) {
      console.error(output);
      console.error("Insert may have failed — does the owner email / org id exist?");
      process.exit(1);
    }
  }
} catch (error) {
  console.error(error.stdout ?? "", error.stderr ?? "", error.message);
  process.exit(1);
}

console.log(`token_id:   ${id}`);
console.log(`kind:       ${kind}`);
console.log(`owner:      ${email}`);
console.log(`org:        ${org}`);
console.log(`scopes:     ${scopes}`);
console.log(`expires_at: ${expiresAt ?? "never"}`);
console.log(`db:         ${db} (${remote ? "remote" : "local"})`);
console.log("");
console.log("PLAINTEXT TOKEN (shown once, store it safely):");
console.log(plaintext);
