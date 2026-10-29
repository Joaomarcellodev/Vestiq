"use client";

import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { ConfirmButton } from "@/components/molecules/confirm-button";
import { moderateReport } from "../actions";
import { MODERATION_REASON_MAX_LENGTH } from "../validation";
import type { ModerationReport } from "../queries";

/** VES-44 — decide an open report; every decision records its reason (BR-MOD-03). */
export function ModerationDecisionForm({ report }: { report: ModerationReport }) {
  const canRemoveOffer = report.targetType === "OFFER" && report.targetActive;
  return (
    <ActionForm
      action={moderateReport}
      className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface"
    >
      <input type="hidden" name="reportId" value={report.id} />
      <h2 className="font-title-lg text-title-lg text-on-surface">Decisão</h2>
      <div>
        <label
          htmlFor="moderation-reason"
          className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
        >
          Motivo da decisão
        </label>
        <textarea
          id="moderation-reason"
          name="reason"
          rows={3}
          maxLength={MODERATION_REASON_MAX_LENGTH}
          aria-describedby="moderation-reason-hint"
          placeholder="Ex.: anúncio de réplica confirmado pelas fotos."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
        <p
          id="moderation-reason-hint"
          className="mt-1 font-label-sm text-label-sm text-on-surface-variant"
        >
          Fica registrado no histórico. Na suspensão, a loja vê este motivo ao tentar entrar.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <SubmitButton name="action" value="DISMISS_REPORT" variant="secondary">
          Arquivar denúncia
        </SubmitButton>
        {canRemoveOffer && (
          <ConfirmButton
            name="action"
            value="REMOVE_OFFER"
            title="Remover esta oferta?"
            description="A oferta sai da rede e deixa de receber propostas. A loja não pode reativá-la."
            confirmLabel="Remover oferta"
          >
            Remover oferta
          </ConfirmButton>
        )}
        {!report.targetOrgSuspended && (
          <ConfirmButton
            name="action"
            value="SUSPEND_ORGANIZATION"
            title={`Suspender ${report.targetOrgName}?`}
            description="Ninguém da loja consegue mais entrar, e as ofertas dela saem da rede. Você pode reativá-la depois no painel de moderação."
            confirmLabel="Suspender loja"
          >
            Suspender loja
          </ConfirmButton>
        )}
      </div>
    </ActionForm>
  );
}
