"use client";

import { useSyncExternalStore } from "react";
import type { Dossier } from "./types";
import { joshDossier } from "./demo-data";

const KEY = "savewatt.dossiers.v1";
const EMPTY: Dossier[] = [];
let cache: Dossier[] | null = null;
const listeners = new Set<() => void>();

function read(): Dossier[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Dossier[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Dossier[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDossiers(): Dossier[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useDossier(id: string): Dossier | undefined {
  return useDossiers().find((d) => d.id === id);
}

export const store = {
  list: read,
  get: (id: string) => read().find((d) => d.id === id),
  create(input: Partial<Dossier>): Dossier {
    const now = Date.now();
    const dossier: Dossier = {
      id: crypto.randomUUID(),
      clientName: input.clientName ?? "",
      segment: input.segment ?? "C5",
      files: input.files ?? {},
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    write([dossier, ...read()]);
    return dossier;
  },
  update(id: string, patch: Partial<Dossier>) {
    write(
      read().map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
    );
  },
  remove(id: string) {
    write(read().filter((d) => d.id !== id));
  },
  seedJosh(): Dossier {
    const existing = read().find((d) => d.id === "josh-sample");
    if (existing) return existing;
    const sample = joshDossier();
    write([sample, ...read()]);
    return sample;
  },
};
