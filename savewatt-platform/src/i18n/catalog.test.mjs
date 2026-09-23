import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const catalogUrl = (locale) => new URL(`../messages/${locale}.json`, import.meta.url);
const sourceUrl = new URL("../", import.meta.url);

async function loadCatalog(locale) {
  return JSON.parse(await readFile(catalogUrl(locale), "utf8"));
}

function variables(message) {
  return [...message.matchAll(/\{([\p{L}\p{N}_]+)(?:[,}])/gu)]
    .map((match) => match[1])
    .sort();
}

function assertMatchingCatalogs(reference, candidate, path = "") {
  assert.equal(typeof candidate, typeof reference, `Type mismatch at ${path}`);

  if (typeof reference === "string") {
    assert.deepEqual(
      variables(candidate),
      variables(reference),
      `ICU variables differ at ${path}`,
    );
    return;
  }

  assert.ok(reference && !Array.isArray(reference), `Expected an object at ${path}`);
  assert.ok(candidate && !Array.isArray(candidate), `Expected an object at ${path}`);

  const referenceKeys = Object.keys(reference).sort();
  assert.deepEqual(Object.keys(candidate).sort(), referenceKeys, `Keys differ at ${path || "root"}`);

  for (const key of referenceKeys) {
    assertMatchingCatalogs(reference[key], candidate[key], path ? `${path}.${key}` : key);
  }
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) return sourceFiles(url);
      return /\.tsx?$/.test(entry.name) ? [url] : [];
    }),
  );

  return files.flat();
}

function translatorBindings(source) {
  const bindings = new Map();
  const patterns = [
    /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(["'])([^"']+)\2\s*\)/g,
    /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\(\s*\{[\s\S]*?\bnamespace\s*:\s*(["'])([^"']+)\2[\s\S]*?\}\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const [, name, , namespace] = match;
      const namespaces = bindings.get(name) ?? new Set();
      namespaces.add(namespace);
      bindings.set(name, namespaces);
    }
  }

  return bindings;
}

function literalTranslationCalls(source, binding, namespaces) {
  const escapedBinding = binding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escapedBinding}\\(\\s*(["'\\x60])((?:\\\\.|(?!\\1)[^\\r\\n])*)\\1`, "g");
  const calls = [];

  for (const match of source.matchAll(pattern)) {
    if (match[1] === "`" && match[2].includes("${")) continue;
    for (const namespace of namespaces) calls.push(`${namespace}.${match[2]}`);
  }

  return calls;
}

function hasMessage(catalog, id) {
  const value = id.split(".").reduce((candidate, key) => candidate?.[key], catalog);
  return typeof value === "string";
}

test("English catalog implements every French message and ICU variable", async () => {
  const [fr, en] = await Promise.all([loadCatalog("fr"), loadCatalog("en")]);
  assertMatchingCatalogs(fr, en);
});

test("supported catalog files are available", async () => {
  const catalogs = await Promise.all([loadCatalog("fr"), loadCatalog("en")]);
  assert.equal(catalogs.length, 2);
});

test("literal translation calls exist in every catalog", async () => {
  const [fr, en, files] = await Promise.all([
    loadCatalog("fr"),
    loadCatalog("en"),
    sourceFiles(sourceUrl),
  ]);
  const missing = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const [binding, namespaces] of translatorBindings(source)) {
      for (const id of literalTranslationCalls(source, binding, namespaces)) {
        const absentLocales = [
          !hasMessage(fr, id) && "fr",
          !hasMessage(en, id) && "en",
        ].filter(Boolean);
        if (absentLocales.length > 0) {
          missing.push(`${file.pathname.replace(sourceUrl.pathname, "src/")}: ${id} (${absentLocales.join(", ")})`);
        }
      }
    }
  }

  assert.deepEqual([...new Set(missing)].sort(), [], `Missing translation messages:\n${[...new Set(missing)].sort().join("\n")}`);
});
