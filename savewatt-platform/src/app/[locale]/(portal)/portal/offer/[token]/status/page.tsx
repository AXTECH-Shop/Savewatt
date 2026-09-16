import { ClockCountdown } from "@phosphor-icons/react/dist/ssr";

export default function PortalStatusPage() {
  return <div className="rise mx-auto max-w-xl py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning"><ClockCountdown size={27} /></span><p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-warning">En attente</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">Votre signature n’est pas encore confirmée.</h1><p className="mt-3 text-sm leading-6 text-muted">Cette page se mettra à jour uniquement après réception et archivage du webhook DocuSeal. Un événement navigateur seul ne suffit pas.</p></div>;
}
