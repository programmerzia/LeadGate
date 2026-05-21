import { listLeadsAction } from "@/app/actions/leads";
import { Dashboard } from "@/app/components/Dashboard";
import { DEFAULT_TENANT_ID } from "@/lib/tenants";

export default async function HomePage() {
  const initial = await listLeadsAction(DEFAULT_TENANT_ID);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10">
      <BackgroundDecoration />

      <header className="relative">
        <div className="flex items-center gap-2 text-xs font-medium opacity-60">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          AI-assisted demo · Lead Gate
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent">
            Qualify a lead.
          </span>{" "}
          <span className="opacity-80">Tenant-safe by construction.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-70">
          One business rule, end-to-end: empty or disposable email →{" "}
          <strong>excluded with reason</strong>; otherwise{" "}
          <strong>outbound ready</strong>. Every row is scoped by{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
            tenant_id
          </code>{" "}
          with Row-Level Security.
        </p>
      </header>

      <Dashboard
        initialTenantId={DEFAULT_TENANT_ID}
        initialLeads={initial.leads}
        initialStats={initial.stats}
        backend={initial.backend}
      />

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4 text-xs opacity-60 dark:border-white/10">
        <span>
          Built with Next.js 15 · TypeScript · Tailwind · Supabase · Vitest
        </span>
        <span>
          AI workflow: Plan → grill-me → Skill → Build → Test → Review
        </span>
      </footer>
    </main>
  );
}

function BackgroundDecoration() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-300/30 via-fuchsia-300/30 to-rose-300/30 blur-3xl dark:from-indigo-700/20 dark:via-fuchsia-700/20 dark:to-rose-700/20" />
      <div className="absolute bottom-0 right-0 h-[320px] w-[420px] translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-tr from-emerald-300/20 to-sky-300/20 blur-3xl dark:from-emerald-700/15 dark:to-sky-700/15" />
    </div>
  );
}
