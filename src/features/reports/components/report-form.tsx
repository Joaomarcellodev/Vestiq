"use client";

import Link from "next/link";
import { Button } from "@/components/atoms";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { REPORT_REASON } from "@/lib/i18n/labels";
import { submitReport } from "../actions";
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_REASONS,
  reportTargetPath,
  type ReportTarget,
} from "../validation";

/** VES-43 — reason (required) and an optional description. */
export function ReportForm({
  targetType,
  targetId,
}: {
  targetType: ReportTarget;
  targetId: string;
}) {
  return (
    <ActionForm action={submitReport} className="space-y-lg">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <fieldset className="space-y-sm">
        <legend className="mb-1.5 font-body-md text-body-md font-semibold text-on-surface">
          Motivo
        </legend>
        {REPORT_REASONS.map((reason) => (
          <label
            key={reason}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface has-[:checked]:border-primary-container has-[:checked]:bg-primary-fixed"
          >
            <input
              type="radio"
              name="reason"
              value={reason}
              required
              className="h-4 w-4 accent-primary-container"
            />
            {REPORT_REASON[reason]}
          </label>
        ))}
      </fieldset>
      <div>
        <label
          htmlFor="report-description"
          className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
        >
          O que aconteceu? (opcional)
        </label>
        <textarea
          id="report-description"
          name="description"
          rows={4}
          maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
          placeholder="Conte o que você viu. Isso ajuda a moderação a decidir."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={reportTargetPath(targetType, targetId)} className="block">
          <Button type="button" variant="secondary" className="w-full sm:w-auto">
            Voltar
          </Button>
        </Link>
        <SubmitButton variant="danger" className="w-full sm:w-auto">
          Enviar denúncia
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
