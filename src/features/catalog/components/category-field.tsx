"use client";

import { useId, useState, useTransition } from "react";
import { Button, Icon } from "@/components/atoms";
import { createCategory } from "../actions";

type Category = { id: string; name: string };

const fieldClass =
  "field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 font-body-md text-body-md";

/**
 * Category picker for the product forms (AC-PROD-001-06). "Nova categoria"
 * creates it in place — the product form can't nest a second `<form>`, so the
 * action is called directly — and selects the new option.
 */
export function CategoryField({
  categories,
  defaultValue = "",
  emptyLabel,
}: {
  categories: Category[];
  defaultValue?: string;
  emptyLabel: string;
}) {
  const id = useId();
  const [options, setOptions] = useState(categories);
  const [value, setValue] = useState(defaultValue);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function create() {
    const fd = new FormData();
    fd.set("name", name);
    startTransition(async () => {
      const result = await createCategory({}, fd);
      if (!result.category) {
        setError(result.error ?? "Não foi possível criar a categoria");
        return;
      }
      const created = result.category;
      setOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setValue(created.id);
      setName("");
      setError(undefined);
      setCreating(false);
    });
  }

  return (
    <div>
      <label
        htmlFor={`${id}-select`}
        className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
      >
        Categoria
      </label>
      <select
        id={`${id}-select`}
        name="categoryId"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={fieldClass}
      >
        <option value="">{emptyLabel}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {creating ? (
        <div className="mt-2 space-y-1.5">
          <label htmlFor={`${id}-new`} className="sr-only">
            Nome da nova categoria
          </label>
          <div className="flex gap-2">
            <input
              id={`${id}-new`}
              value={name}
              maxLength={80}
              autoFocus
              placeholder="Nome da nova categoria"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                // Enter would submit the product form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
              className={fieldClass}
            />
            <Button type="button" onClick={create} loading={pending}>
              Criar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setError(undefined);
              }}
            >
              Cancelar
            </Button>
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="font-body-md text-body-md text-error">
              {error}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-2 inline-flex items-center gap-1 font-body-md text-body-md font-semibold text-primary-container hover:underline"
        >
          <Icon name="add" size={16} />
          Nova categoria
        </button>
      )}
    </div>
  );
}
