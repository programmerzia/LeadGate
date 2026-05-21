"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitLeadAction, type SubmitState } from "@/app/actions/leads";

export function LeadForm({
  tenantId,
  onSuccess,
}: {
  tenantId: string;
  onSuccess: (state: Extract<SubmitState, { ok: true }>) => void;
}) {
  const [state, formAction, pending] = useActionState<
    SubmitState | null,
    FormData
  >(submitLeadAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  // Track the exact state object we've already notified about, so we only
  // call onSuccess once per submission (not on every parent re-render).
  const handledRef = useRef<SubmitState | null>(null);

  useEffect(() => {
    if (state && state.ok && handledRef.current !== state) {
      handledRef.current = state;
      onSuccess(state);
      formRef.current?.reset();
    }
  }, [state, onSuccess]);

  const fieldErr = (name: string): string | undefined => {
    if (!state || state.ok) return undefined;
    return state.fieldErrors?.[name]?.[0];
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
    >
      {/* Always reflect the active tenant in the form payload. */}
      <input type="hidden" name="tenant_id" value={tenantId} />

      <Field
        name="company_name"
        label="Company name"
        placeholder="Acme Corp"
        required
        error={fieldErr("company_name")}
      />
      <Field
        name="contact_email"
        label="Contact email"
        placeholder="founder@acme.no  (leave empty to test exclusion)"
        type="text"
        autoComplete="off"
        spellCheck={false}
        error={fieldErr("contact_email")}
        hint="Empty = excluded · disposable provider = excluded"
      />
      <Field
        name="org_number"
        label="Org number"
        placeholder="123456789  (optional)"
        autoComplete="off"
        spellCheck={false}
        error={fieldErr("org_number")}
      />

      {state && !state.ok ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300/50 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Spinner /> Qualifying…
          </>
        ) : (
          <>Qualify lead</>
        )}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </span>
      <input
        name={name}
        {...rest}
        aria-invalid={Boolean(error)}
        className={[
          "w-full rounded-lg border bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition",
          "placeholder:opacity-40",
          "focus:ring-2 focus:ring-indigo-500/40",
          "dark:bg-white/5",
          error
            ? "border-rose-400 dark:border-rose-500/60"
            : "border-black/10 dark:border-white/10",
        ].join(" ")}
      />
      {error ? (
        <span className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs opacity-50">{hint}</span>
      ) : null}
    </label>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
