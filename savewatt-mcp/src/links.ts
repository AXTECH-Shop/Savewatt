/**
 * Stateless signed links (HMAC-SHA256, LINK_SECRET): a client-facing upload
 * page for a dossier, and short-lived downloads of archived offer PDFs.
 */

export interface UploadLinkClaims {
  t: "u";
  /** dossier id */
  d: string;
  /** document kind expected (BILL | CURRENT_CONTRACT | SUPPLIER_OFFER) */
  k: string;
  /** issuing SaveWatt user (uploads are attributed to them) */
  u: string;
  /** expiry, unix seconds */
  e: number;
}

export interface FileLinkClaims {
  t: "f";
  /** R2 key */
  r: string;
  /** download file name */
  f: string;
  e: number;
}

export type LinkClaims = UploadLinkClaims | FileLinkClaims;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signLink(secret: string, claims: LinkClaims): Promise<string> {
  if (!secret) throw new Error("LINK_SECRET_MISSING");
  const payload = base64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyLink<T extends LinkClaims["t"]>(
  secret: string | undefined,
  token: string,
  type: T,
  now: number = Math.floor(Date.now() / 1000),
): Promise<Extract<LinkClaims, { t: T }> | null> {
  if (!secret || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
  const [payload, signature] = token.split(".");
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(signature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;
  let claims: LinkClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as LinkClaims;
  } catch {
    return null;
  }
  if (claims.t !== type || typeof claims.e !== "number" || claims.e < now) return null;
  return claims as Extract<LinkClaims, { t: T }>;
}

export function nowPlus(hours: number): number {
  return Math.floor(Date.now() / 1000) + Math.round(hours * 3600);
}
