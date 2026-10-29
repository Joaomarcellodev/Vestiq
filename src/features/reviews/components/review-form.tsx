"use client";

import { useState } from "react";
import { Icon } from "@/components/atoms";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { cn } from "@/lib/utils/cn";
import { submitReview } from "../actions";
import { REVIEW_COMMENT_MAX_LENGTH, type ReviewKind } from "../validation";

const LABELS = ["Muito ruim", "Ruim", "Regular", "Boa", "Excelente"];

/** VES-42 — 1–5 stars (a radio group) and an optional comment. */
export function ReviewForm({
  kind,
  transactionId,
  counterpartyName,
}: {
  kind: ReviewKind;
  transactionId: string;
  counterpartyName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <ActionForm action={submitReview} className="space-y-md">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="transactionId" value={transactionId} />
      <fieldset>
        <legend className="mb-1.5 font-body-md text-body-md font-semibold text-on-surface">
          Como foi negociar com {counterpartyName}?
        </legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {LABELS.map((label, i) => {
            const value = i + 1;
            return (
              <label
                key={value}
                className="cursor-pointer rounded-md p-0.5 focus-within:ring-2 focus-within:ring-primary-container"
                onMouseEnter={() => setHover(value)}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  required
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                  aria-label={`${value} — ${label}`}
                />
                <Icon
                  name="star"
                  size={28}
                  fill={value <= shown ? "currentColor" : "none"}
                  className={cn(value <= shown ? "text-secondary" : "text-outline")}
                />
              </label>
            );
          })}
          <span className="ml-2 font-body-md text-body-md text-on-surface-variant" aria-hidden>
            {shown ? LABELS[shown - 1] : ""}
          </span>
        </div>
      </fieldset>
      <div>
        <label
          htmlFor="review-comment"
          className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
        >
          Comentário (opcional)
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={3}
          maxLength={REVIEW_COMMENT_MAX_LENGTH}
          placeholder="Ex.: peça conforme o anunciado, combinou a entrega rápido..."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">Enviar avaliação</SubmitButton>
      </div>
    </ActionForm>
  );
}
