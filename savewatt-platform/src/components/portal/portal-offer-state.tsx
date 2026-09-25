import {
  ClockCountdown,
  LinkBreak,
  Prohibit,
  ShieldWarning,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { PortalOfferResolution } from "@/lib/portal/portal-offer-loader";

type PortalStateKind = Exclude<PortalOfferResolution["kind"], "ready">;

const STATE_PRESENTATION: Record<
  PortalStateKind,
  { eyebrow: string; title: string; body: string; Icon: typeof Warning }
> = {
  invalid: {
    eyebrow: "invalidEyebrow",
    title: "invalidTitle",
    body: "invalidBody",
    Icon: LinkBreak,
  },
  "token-expired": {
    eyebrow: "tokenExpiredEyebrow",
    title: "tokenExpiredTitle",
    body: "tokenExpiredBody",
    Icon: ClockCountdown,
  },
  "offer-expired": {
    eyebrow: "offerExpiredEyebrow",
    title: "offerExpiredTitle",
    body: "offerExpiredBody",
    Icon: ClockCountdown,
  },
  revoked: {
    eyebrow: "revokedEyebrow",
    title: "revokedTitle",
    body: "revokedBody",
    Icon: Prohibit,
  },
  unavailable: {
    eyebrow: "unavailableEyebrow",
    title: "unavailableTitle",
    body: "unavailableBody",
    Icon: ShieldWarning,
  },
};

/** Friendly, leak-free rendering for every non-ready portal resolution. */
export async function PortalOfferState({
  state,
}: {
  state: Exclude<PortalOfferResolution, { kind: "ready" }>;
}) {
  const t = await getTranslations("portal.state");
  const presentation = STATE_PRESENTATION[state.kind];
  const { Icon } = presentation;
  return (
    <div className="rise mx-auto max-w-xl py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
        <Icon size={27} />
      </span>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-warning">
        {t(presentation.eyebrow)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">
        {t(presentation.title)}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">{t(presentation.body)}</p>
      <p className="mt-6 text-xs leading-5 text-faint">{t("contactHint")}</p>
    </div>
  );
}
