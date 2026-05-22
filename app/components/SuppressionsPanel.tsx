"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import {
  addSuppressionAction,
  removeSuppressionAction,
} from "@/app/actions/suppressions";
import type { Suppression } from "@/lib/types";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "Adding..." : children}
    </button>
  );
}

export function SuppressionsPanel({
  tenantId,
  suppressions: initialSuppressions,
}: {
  tenantId: string;
  suppressions: Suppression[];
}) {
  const [suppressions, setSuppressions] = useState(initialSuppressions);
  const [kind, setKind] = useState<"email" | "domain">("email");
  const [addState, addFormAction] = useFormState(addSuppressionAction, null);

  // Optimistically update UI on successful add
  if (addState?.ok && !suppressions.find((s) => s.id === addState.suppression.id)) {
    setSuppressions([addState.suppression, ...suppressions]);
  }

  async function handleRemove(id: string) {
    const formData = new FormData();
    formData.set("tenant_id", tenantId);
    formData.set("id", id);

    const result = await removeSuppressionAction(null, formData);
    if (result.ok) {
      setSuppressions(suppressions.filter((s) => s.id !== id));
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Suppression List
      </h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Block emails or domains from outbound. <strong>Applies to new submissions only.</strong>
      </p>

      <form action={addFormAction} className="mb-6 flex gap-2">
        <input type="hidden" name="tenant_id" value={tenantId} />
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as "email" | "domain")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700"
        >
          <option value="email">Email</option>
          <option value="domain">Domain</option>
        </select>
        <input
          type="text"
          name="pattern"
          placeholder={kind === "email" ? "user@example.com" : "example.com"}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700"
          required
        />
        <SubmitButton>Add</SubmitButton>
      </form>

      {addState && !addState.ok && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {addState.error}
          {addState.fieldErrors?.pattern && ` ${addState.fieldErrors.pattern[0]}`}
        </div>
      )}

      <div className="space-y-2">
        {suppressions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No suppressions yet. Add an email or domain above.
          </p>
        ) : (
          suppressions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-sm dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {s.kind}
                </span>
                <span className="text-slate-900 dark:text-slate-100">{s.pattern}</span>
              </div>
              <button
                onClick={() => handleRemove(s.id)}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
