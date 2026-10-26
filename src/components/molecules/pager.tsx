import Link from "next/link";
import { Button, Icon } from "@/components/atoms";
import { pageHref } from "@/lib/pagination";

export interface PagerProps {
  basePath: string;
  /** The page's current query params — kept in the links (search, tabs). */
  params: Record<string, string | undefined>;
  page: number;
  hasNext: boolean;
}

/** VES-90 — "Anterior · Página N · Próxima" under a paged list; hidden on a lone page. */
export function Pager({ basePath, params, page, hasNext }: PagerProps) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2">
      {page > 1 && (
        <Link href={pageHref(basePath, params, page - 1)}>
          <Button variant="ghost" size="sm">
            <Icon name="chevron_left" size={16} />
            Anterior
          </Button>
        </Link>
      )}
      <span className="font-label-md text-label-md text-on-surface-variant">Página {page}</span>
      {hasNext && (
        <Link href={pageHref(basePath, params, page + 1)}>
          <Button variant="secondary" size="sm">
            Próxima
            <Icon name="chevron_right" size={16} />
          </Button>
        </Link>
      )}
    </nav>
  );
}
