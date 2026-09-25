import { Button, Icon } from "@/components/atoms";

/** GET search form — keeps the other query params as hidden fields. */
export function SupplierSearchForm({
  query,
  placeholder,
  hidden = {},
}: {
  query?: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex w-full gap-2 sm:w-auto">
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label className="relative w-full min-w-0 sm:w-72">
        <span className="sr-only">{placeholder}</span>
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 font-body-md text-body-md"
        />
      </label>
      <Button type="submit" variant="secondary">
        Buscar
      </Button>
    </form>
  );
}
