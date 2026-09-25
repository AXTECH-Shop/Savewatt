import "server-only";

/**
 * Keyless Google Cloud access for the Worker via Workload Identity Federation.
 *
 * The Worker signs a short-lived OIDC JWT with GCP_WIF_PRIVATE_KEY (its public
 * JWKS is uploaded to the WIF provider), exchanges it at Google STS, and uses the
 * federated token directly against Vertex AI. No Google API key or service-account
 * key exists (both are blocked by the organisation policy).
 */
const ISSUER = "https://app.savewatt.fr";
const SUBJECT = "savewatt-platform-worker";
const AUDIENCE = "savewatt-vertex";
const KEY_ID = "savewatt-worker-1";
const DEFAULT_PROVIDER =
  "//iam.googleapis.com/projects/786728897296/locations/global/workloadIdentityPools/savewatt-workers/providers/savewatt-platform";

let cached: { token: string; expiresAt: number } | null = null;
let signingKey: Promise<CryptoKey> | null = null;

function base64Url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function importSigningKey(): Promise<CryptoKey> {
  const pem = process.env.GCP_WIF_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!pem) {
    throw new Error(
      "GCP_WIF_PRIVATE_KEY is not set. Configure the Workload Identity signing key before extracting.",
    );
  }
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signSubjectToken(): Promise<string> {
  signingKey ??= importSigningKey().catch((error) => {
    signingKey = null;
    throw error;
  });
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: KEY_ID }))}.${base64Url(
    JSON.stringify({ iss: ISSUER, sub: SUBJECT, aud: AUDIENCE, iat: now, exp: now + 300 }),
  )}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await signingKey,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

export async function getGoogleAccessToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  const response = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: process.env.GCP_WIF_PROVIDER || DEFAULT_PROVIDER,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      subjectToken: await signSubjectToken(),
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
    }),
  });
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new Error(`Google STS token exchange failed (${response.status}): ${body.error_description ?? "unknown"}`);
  }
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}
