import { CrmError } from "@/lib/crm/crm-errors";
import { CrmScopePolicy } from "@/lib/crm/crm-scope-policy";
import { DossierRepository } from "@/lib/crm/dossier-repository";
import { DocumentManager } from "@/lib/documents/document-manager";
import { DocumentRepository } from "@/lib/documents/document-repository";
import { DocumentValidationManager } from "@/lib/documents/document-validation-manager";
import type { McpEnv } from "./context.ts";
import { verifyLink } from "./links.ts";
import { loadActor } from "./oauth.ts";

const MAX_UPLOAD_BODY_BYTES = 11 * 1024 * 1024;

const KIND_LABELS: Record<string, string> = {
  BILL: "votre dernière facture d'électricité",
  CURRENT_CONTRACT: "votre contrat d'électricité actuel",
  SUPPLIER_OFFER: "l'offre fournisseur",
};

const PAGE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — SaveWatt</title>
<style>
body{margin:0;background:#F5F1E8;color:#1d2b25;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:560px;margin:48px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.brand{font-weight:700;font-size:20px;margin:0 0 24px}.brand span{color:#118a34}
h1{font-size:22px;margin:0 0 12px}p{margin:0 0 16px}.muted{color:#5b665f;font-size:14px}
input[type=file]{display:block;width:100%;padding:16px;border:2px dashed #b7c4bb;border-radius:12px;margin:8px 0 20px;background:#fafaf7}
button{background:#118a34;color:#fff;border:0;border-radius:10px;padding:14px 22px;font-size:16px;font-weight:600;cursor:pointer}
button:focus-visible,input:focus-visible{outline:3px solid #1d2b25;outline-offset:2px}
</style></head><body><main><p class="brand">Save<span>Watt</span></p>${body}
<p class="muted">SaveWatt ne vend pas d'énergie : nous vous accompagnons dans le choix de votre contrat.</p></main></body></html>`,
    { status, headers: PAGE_HEADERS },
  );
}

function invalidLink(): Response {
  return page(
    "Lien invalide",
    `<h1>Lien invalide ou expiré</h1><p>Ce lien de dépôt n'est plus valable. Contactez votre conseiller SaveWatt pour en recevoir un nouveau.</p>`,
    410,
  );
}

/** GET/POST /u/:token — client-facing document drop for one dossier. */
export async function handleUploadPage(request: Request, env: McpEnv, token: string): Promise<Response> {
  const claims = await verifyLink(env.LINK_SECRET, token, "u");
  if (!claims) return invalidLink();
  const actor = await loadActor(env.DB, claims.u);
  if (!actor) return invalidLink();

  const scopePolicy = new CrmScopePolicy();
  const dossier = await new DossierRepository(env.DB, scopePolicy).find(actor, claims.d);
  if (!dossier) return invalidLink();
  const label = KIND_LABELS[claims.k] ?? "votre document";

  if (request.method === "GET") {
    return page(
      "Déposer un document",
      `<h1>Déposez ${escapeHtml(label)}</h1>
<p>Pour <strong>${escapeHtml(dossier.clientName)}</strong>. Format PDF ou photo (PNG, JPEG, WebP), 10 Mo maximum.</p>
<form method="post" enctype="multipart/form-data">
<label for="file">Fichier</label>
<input id="file" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required>
<button type="submit">Envoyer le document</button>
</form>`,
    );
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "GET, POST" } });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_UPLOAD_BODY_BYTES) {
    return page("Fichier trop volumineux", `<h1>Fichier trop volumineux</h1><p>La taille maximale est de 10 Mo.</p>`, 413);
  }
  let file: File | string | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    file = null;
  }
  if (!file || typeof file === "string") {
    return page("Aucun fichier", `<h1>Aucun fichier reçu</h1><p>Revenez en arrière et sélectionnez un fichier.</p>`, 400);
  }

  const manager = new DocumentManager(
    new DocumentRepository(env.DB, scopePolicy),
    env.DOCUMENTS,
    new DocumentValidationManager(),
  );
  try {
    await manager.upload(actor, claims.d, claims.k, file);
  } catch (error) {
    if (error instanceof CrmError && error.status === 415) {
      return page("Format non accepté", `<h1>Format non accepté</h1><p>Envoyez un PDF ou une photo (PNG, JPEG, WebP).</p>`, 415);
    }
    if (error instanceof CrmError && error.field === "fileSize") {
      return page("Fichier trop volumineux", `<h1>Fichier invalide</h1><p>Le fichier est vide ou dépasse 10 Mo.</p>`, 400);
    }
    return page("Erreur", `<h1>Le dépôt a échoué</h1><p>Réessayez dans quelques instants.</p>`, 503);
  }
  return page(
    "Document reçu",
    `<h1>Merci, document bien reçu</h1><p>Votre conseiller SaveWatt l'analyse et revient vers vous avec une offre personnalisée.</p>`,
  );
}

/** GET /f/:token — short-lived download of an archived offer PDF. */
export async function handleFileDownload(env: McpEnv, token: string): Promise<Response> {
  const claims = await verifyLink(env.LINK_SECRET, token, "f");
  if (!claims || !claims.r.startsWith("offers/")) return new Response("Lien invalide ou expiré", { status: 410 });
  const object = await env.DOCUMENTS.get(claims.r);
  if (!object) return new Response("Introuvable", { status: 404 });
  const fileName = claims.f.replace(/[^a-zA-Z0-9._-]+/g, "-") || "offre-savewatt.pdf";
  return new Response(object.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
