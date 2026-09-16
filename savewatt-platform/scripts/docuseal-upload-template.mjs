import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

class DocuSealTemplateUploader {
  constructor({ baseUrl, apiToken }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiToken = apiToken;
  }

  async upload(filePath) {
    const pdf = await readFile(filePath);
    const response = await fetch(`${this.baseUrl}/templates/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": this.apiToken,
      },
      body: JSON.stringify({
        name: "Contrat de fourniture Symphonics — SaveWatt",
        folder_name: "SaveWatt",
        external_id: "savewatt-symphonics-contract-v1",
        shared_link: false,
        flatten: true,
        documents: [
          {
            name: "Contrat de fourniture",
            file: pdf.toString("base64"),
            fields: [
              {
                name: "Date de signature",
                title: "Date de signature",
                type: "date",
                role: "Client",
                required: true,
                areas: [{ x: 0.32, y: 0.285, w: 0.22, h: 0.035, page: 2 }],
              },
              {
                name: "Signature du client",
                title: "Signature du client",
                type: "signature",
                role: "Client",
                required: true,
                areas: [{ x: 0.51, y: 0.35, w: 0.32, h: 0.1, page: 2 }],
              },
            ],
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`DocuSeal template upload failed (${response.status}).`);
    }
    if (!payload || typeof payload.id !== "number") {
      throw new Error("DocuSeal returned an invalid template response.");
    }
    return { id: payload.id, slug: payload.slug, name: payload.name };
  }
}

const apiToken = process.env.DOCUSEAL_API_TOKEN;
const baseUrl = process.env.DOCUSEAL_BASE_URL ?? "https://api.docuseal.eu";
const source = resolve(process.argv[2] ?? "../docs/symphonics-contract.pdf");

if (!apiToken) {
  throw new Error("DOCUSEAL_API_TOKEN is missing. Put it in the ignored .env.local file.");
}
if (process.env.DOCUSEAL_SOURCE_CONFIRMED_SANITIZED !== "true") {
  throw new Error(
    `Refusing to upload ${basename(source)} until DOCUSEAL_SOURCE_CONFIRMED_SANITIZED=true.`,
  );
}

const uploader = new DocuSealTemplateUploader({ baseUrl, apiToken });
const template = await uploader.upload(source);
console.log(JSON.stringify(template));
