"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

interface GiftRedemptionFormProps {
  configured: boolean;
}

const amounts = [25, 50, 100, 150];

export function GiftRedemptionForm({ configured }: GiftRedemptionFormProps) {
  const [amount, setAmount] = useState(25);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function redeem() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/gifting/redemptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ amountCents: amount * 100 }),
      });
      const result = (await response.json()) as { error?: string; orderId?: string };
      if (!response.ok || !result.orderId) {
        throw new Error(result.error ?? "REDEMPTION_FAILED");
      }
      setMessage(`Émission confirmée · référence ${result.orderId}`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "REDEMPTION_FAILED";
      setMessage(
        code === "WALLET_NOT_PROVISIONED_OR_INSUFFICIENT"
          ? "Solde insuffisant ou portefeuille non activé."
          : "L’émission n’a pas abouti. Aucun débit définitif n’a été conservé.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <label className="block text-sm font-medium text-ink" htmlFor="gift-amount">
        Montant
      </label>
      <select
        id="gift-amount"
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
        className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
      >
        {amounts.map((value) => (
          <option key={value} value={value}>
            {value} €
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!configured || pending}
        onClick={redeem}
        className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-deep px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? "Émission en cours…" : "Utiliser mes crédits"}
        {!pending && <ArrowRight size={16} />}
      </button>
      {!configured && (
        <p className="text-xs leading-5 text-muted">
          Activation dès que les identifiants sandbox Giftogram sont ajoutés.
        </p>
      )}
      {message && (
        <p className="text-sm leading-5 text-muted" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
