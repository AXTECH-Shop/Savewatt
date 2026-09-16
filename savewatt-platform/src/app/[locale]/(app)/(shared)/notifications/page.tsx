import { BellRinging, CheckCircle, FileText, PenNib } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/workspace/page-header";

const notifications = [
  { icon: PenNib, title: "Signature attendue", body: "Hôtel Opéra Lafayette n’a pas encore ouvert le lien de signature.", time: "Il y a 18 min", unread: true },
  { icon: FileText, title: "Extraction terminée", body: "Les champs de Boulangerie Lamarck sont prêts à être contrôlés.", time: "Il y a 46 min", unread: true },
  { icon: CheckCircle, title: "Commission validée", body: "123,08 € sont maintenant disponibles pour Médicentre Boulogne.", time: "Hier", unread: false },
];

export default function NotificationsPage() {
  return (
    <div className="rise max-w-4xl">
      <PageHeader eyebrow="Centre de notifications" title="Ce qui demande votre attention" description="Les actions sont regroupées par priorité, avec un lien direct vers le dossier concerné." action={<button className="press h-10 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink">Tout marquer comme lu</button>} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface"><ul className="divide-y divide-line">{notifications.map(({ icon: Icon, ...item }) => <li key={item.title} className={`flex gap-4 px-5 py-5 ${item.unread ? "bg-accent-soft/35" : ""}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.unread ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}><Icon size={20} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold text-ink">{item.title}</h2><span className="shrink-0 text-xs text-faint">{item.time}</span></div><p className="mt-1 text-sm leading-6 text-muted">{item.body}</p></div></li>)}</ul><div className="flex items-center justify-center border-t border-line px-5 py-4 text-sm text-muted"><BellRinging size={17} className="mr-2" /> Les préférences de notification seront configurables depuis votre profil.</div></section>
    </div>
  );
}
