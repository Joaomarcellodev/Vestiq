"use client";

import { ActionForm } from "@/components/molecules/action-form";
import { ConfirmButton } from "@/components/molecules/confirm-button";
import { setOrganizationSuspension } from "../actions";
import { MODERATION_REASON_MAX_LENGTH } from "../validation";

/** VES-44 — reactivate (or suspend) an organization, with the reason on record. */
export function SuspensionForm({
  organizationId,
  organizationName,
  suspended,
  back,
}: {
  organizationId: string;
  organizationName: string;
  /** What the form does: `false` reactivates. */
  suspended: boolean;
  /** Page to return to. */
  back: string;
}) {
  const verb = suspended ? "Suspender" : "Reativar";
  const fieldId = `suspension-reason-${organizationId}`;
  return (
    <ActionForm action={setOrganizationSuspension} className="space-y-sm">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="suspended" value={suspended ? "1" : "0"} />
      <input type="hidden" name="back" value={back} />
      <label
        htmlFor={fieldId}
        className="block font-body-md text-body-md font-semibold text-on-surface"
      >
        Motivo para {verb.toLowerCase()} {organizationName}
      </label>
      <textarea
        id={fieldId}
        name="reason"
        rows={2}
        maxLength={MODERATION_REASON_MAX_LENGTH}
        className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
      />
      <div className="flex justify-end">
        <ConfirmButton
          variant={suspended ? "danger" : "primary"}
          size="sm"
          title={`${verb} ${organizationName}?`}
          description={
            suspended
              ? "Ninguém da loja consegue mais entrar, e as ofertas dela saem da rede."
              : "A loja volta a entrar e as ofertas ativas dela voltam para a rede."
          }
          confirmLabel={`${verb} loja`}
        >
          {verb} loja
        </ConfirmButton>
      </div>
    </ActionForm>
  );
}
