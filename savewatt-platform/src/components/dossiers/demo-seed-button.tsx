"use client";

import { Sparkle } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { store } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function DemoSeedButton() {
  const router = useRouter();
  if (process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE !== "true") return null;

  function openSample() {
    const dossier = store.seedJosh();
    router.push(`/dossiers/${dossier.id}`);
  }

  return <Button variant="secondary" onClick={openSample}><Sparkle size={16} weight="fill" />Ouvrir le dossier test</Button>;
}
