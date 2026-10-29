import type { Review } from "../queries";
import type { ReviewKind } from "../validation";
import { ReviewForm } from "./review-form";
import { StarRating } from "./star-rating";

/**
 * VES-42 — "Avaliação" block of a finished negotiation or delivered supply
 * order: the form until the org rates the other party, then what it wrote,
 * plus what the other party wrote about it.
 */
export function ReviewSection({
  kind,
  transactionId,
  counterpartyName,
  mine,
  received,
}: {
  kind: ReviewKind;
  transactionId: string;
  counterpartyName: string;
  mine: Review | null;
  received: Review | null;
}) {
  return (
    <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
      <h2 className="font-title-lg text-title-lg text-on-surface">Avaliação</h2>
      {mine ? (
        <ReviewQuote title={`Sua avaliação de ${counterpartyName}`} review={mine} />
      ) : (
        <ReviewForm kind={kind} transactionId={transactionId} counterpartyName={counterpartyName} />
      )}
      {received && <ReviewQuote title={`${counterpartyName} avaliou você`} review={received} />}
    </section>
  );
}

function ReviewQuote({ title, review }: { title: string; review: Review }) {
  return (
    <div className="border-t border-outline-variant pt-md first:border-t-0 first:pt-0">
      <p className="font-body-md text-body-md font-semibold text-on-surface">{title}</p>
      <div className="mt-1">
        <StarRating value={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-1 whitespace-pre-line font-body-md text-body-md text-on-surface-variant">
          {review.comment}
        </p>
      )}
    </div>
  );
}
