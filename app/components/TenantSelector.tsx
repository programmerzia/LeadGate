"use client";

import { TENANTS } from "@/lib/tenants";

export function TenantSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Active tenant"
      className="inline-flex rounded-xl border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
    >
      {TENANTS.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={[
              "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
              active
                ? `bg-gradient-to-r ${t.accent} text-white shadow`
                : "text-slate-700 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10",
              disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
