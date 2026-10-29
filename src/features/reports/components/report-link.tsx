import Link from "next/link";
import { Icon } from "@/components/atoms";
import { reportHref, type ReportTarget } from "../validation";

/** VES-43 — discreet "Denunciar" link to the report form. */
export function ReportLink({
  target,
  id,
  label = "Denunciar",
}: {
  target: ReportTarget;
  id: string;
  label?: string;
}) {
  return (
    <Link
      href={reportHref(target, id)}
      className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-error hover:underline"
    >
      <Icon name="flag" size={14} />
      {label}
    </Link>
  );
}
