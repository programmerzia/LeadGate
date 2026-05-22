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
          Lead Gate
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent">
            Qualify inbound leads.
          </span>{" "}
          <span className="opacity-80">Before outbound wastes them.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm opacity-70">
          Every contact runs through one auditable rule before it joins your
          outbound pipeline. Missing or disposable emails are filed for
          enrichment instead of burning sender reputation. Each record stays
          inside its workspace — enforced at the database with row-level
          security.
        </p>
      </header>

      <Dashboard
        initialTenantId={DEFAULT_TENANT_ID}
        initialLeads={initial.leads}
        initialStats={initial.stats}
        initialSuppressions={initial.suppressions}
        backend={initial.backend}
      />

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4 text-xs opacity-50 dark:border-white/10">
        <span>© Lead Gate</span>
        <span>Powered by Next.js · Supabase · TypeScript</span>
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
