"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Badge, Button, Icon, TextField } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import {
  createCategory,
  renameCategory,
  setCategoryArchived,
  type ActionState,
  type CategoryActionState,
} from "../actions";
import type { CategoryListItem } from "../queries";

/** AC-PROD-001-01..04 — create, rename, archive and reactivate categories. */
export function CategoryManager({ categories }: { categories: CategoryListItem[] }) {
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  return (
    <div className="space-y-lg">
      <NewCategoryForm />

      <section className="space-y-sm">
        <h2 className="font-title-lg text-title-lg text-on-surface">Ativas ({active.length})</h2>
        {active.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Nenhuma categoria ativa. Crie a primeira acima.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest shadow-surface">
            {active.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section className="space-y-sm">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Arquivadas ({archived.length})
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Não aparecem no cadastro de produtos nem no filtro. Os produtos continuam vinculados.
          </p>
          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest shadow-surface">
            {archived.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NewCategoryForm() {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(
    createCategory,
    {},
  );
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.category) {
      formRef.current?.reset();
      toast({ message: `Categoria "${state.category.name}" criada.`, variant: "success" });
    }
  }, [state, toast]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface sm:flex-row sm:items-end"
    >
      <TextField
        label="Nova categoria"
        name="name"
        required
        maxLength={80}
        placeholder="Ex: Bolsas"
        error={state.error}
      />
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        <Icon name="add" size={18} />
        Criar
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: CategoryListItem }) {
  const [editing, setEditing] = useState(false);
  const [renameState, rename, renaming] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await renameCategory(prev, fd);
      if (result.ok) setEditing(false);
      return result;
    },
    {},
  );
  const [archiveState, toggleArchived, archiving] = useActionState<ActionState, FormData>(
    setCategoryArchived,
    {},
  );
  const products = `${category.productCount} produto${category.productCount === 1 ? "" : "s"}`;

  if (editing) {
    return (
      <li className="p-4">
        <form action={rename} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="id" value={category.id} />
          <TextField
            label={`Renomear "${category.name}"`}
            name="name"
            required
            maxLength={80}
            defaultValue={category.name}
            autoFocus
            error={renameState.error}
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={renaming}>
              Salvar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-body-lg text-body-lg font-semibold text-on-surface">
          {category.name}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Badge tone="neutral">{products}</Badge>
          {category.archived && <Badge tone="warning">Arquivada</Badge>}
        </div>
        {archiveState.error && (
          <p role="alert" className="mt-2 font-body-md text-body-md text-error">
            {archiveState.error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!category.archived && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label={`Renomear ${category.name}`}
          >
            <Icon name="edit" size={16} />
            Renomear
          </Button>
        )}
        <form action={toggleArchived}>
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="archived" value={String(!category.archived)} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={archiving}
            aria-label={`${category.archived ? "Reativar" : "Arquivar"} ${category.name}`}
          >
            <Icon name="archive" size={16} />
            {category.archived ? "Reativar" : "Arquivar"}
          </Button>
        </form>
      </div>
    </li>
  );
}
