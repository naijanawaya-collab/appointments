"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction } from "@/app/admin/_actions/catalog";
import { ActionButton, FormStatus, SubmitButton, useFormAction } from "./form-kit";

function CategoryNameForm({ businessId, category, onDone }: { businessId: string; category: { id: string; name: string } | null; onDone?: () => void }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: category?.name ?? "" } });
  const { submit, status, pending } = useFormAction(form, (v) => saveCategoryAction(businessId, category?.id ?? null, v), {
    resetOnSuccess: !category,
    onSuccess: onDone,
  });
  const err = form.formState.errors.name?.message;
  return (
    <form onSubmit={submit} className="ad-inline" noValidate>
      <div className="ad-grow">
        <label className="sr-only" htmlFor={`cat-${category?.id ?? "new"}`}>
          {category ? "Category name" : "New category"}
        </label>
        <input
          id={`cat-${category?.id ?? "new"}`}
          className="field-input is-compact"
          placeholder={category ? undefined : "New category, e.g. Beard & shave"}
          maxLength={60}
          aria-invalid={err ? true : undefined}
          {...form.register("name", { required: "Name the category" })}
        />
      </div>
      <SubmitButton pending={pending} className="btn btn-secondary">
        {category ? "Save" : "Add category"}
      </SubmitButton>
      <FormStatus status={err ? { kind: "error", message: err } : status} />
    </form>
  );
}

/** Categories: add, rename, reorder, delete (services become uncategorised). */
export function CategoryManager({ businessId, categories }: { businessId: string; categories: { id: string; name: string; count: number }[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="ad-card" aria-labelledby="categories-title">
      <h2 id="categories-title">Categories</h2>
      <p className="ad-card-intro">Group services on your booking page, e.g. “Haircuts” and “Beard & shave”.</p>
      {categories.length > 0 && (
        <ul className="ad-list" style={{ marginBottom: 12 }}>
          {categories.map((c, i) => (
            <li key={c.id} className="ad-row">
              {editing === c.id ? (
                <div className="ad-row-main">
                  <CategoryNameForm businessId={businessId} category={c} onDone={() => setEditing(null)} />
                </div>
              ) : (
                <>
                  <span className="ad-row-main">
                    <span className="ad-row-title">{c.name}</span>
                    <span className="ad-row-meta">
                      {c.count} {c.count === 1 ? "service" : "services"}
                    </span>
                  </span>
                  <span className="ad-row-side">
                    <ActionButton disabled={i === 0} action={() => moveCategoryAction(businessId, c.id, "up")} className="btn btn-secondary btn-icon" ariaLabel={`Move ${c.name} up`}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </ActionButton>
                    <ActionButton disabled={i === categories.length - 1} action={() => moveCategoryAction(businessId, c.id, "down")} className="btn btn-secondary btn-icon" ariaLabel={`Move ${c.name} down`}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </ActionButton>
                    <button type="button" className="btn btn-link" onClick={() => setEditing(c.id)}>
                      Rename
                    </button>
                    <ActionButton action={() => deleteCategoryAction(businessId, c.id)} className="btn btn-link" confirm={`Delete “${c.name}”?`} confirmLabel="Delete">
                      Delete
                    </ActionButton>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <CategoryNameForm businessId={businessId} category={null} />
    </section>
  );
}
