import { verify } from "@/lib/unsubscribe-token";
import { confirmUnsubscribeAction } from "@/app/actions/unsubscribe";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = verify(token);

  if (!payload) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <h1 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
            Invalid Link
          </h1>
          <p className="text-sm text-red-700 dark:text-red-300">
            This unsubscribe link is invalid or has expired. Please contact support if you
            believe this is an error.
          </p>
        </div>
      </main>
    );
  }

  async function handleConfirm() {
    "use server";
    await confirmUnsubscribeAction(token);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Unsubscribe
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          You are about to unsubscribe <strong>{payload.email}</strong> from all future
          communications.
        </p>
        <form action={handleConfirm}>
          <button
            type="submit"
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
          >
            Confirm Unsubscribe
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          This action cannot be undone. You will no longer receive emails from this sender.
        </p>
      </div>
    </main>
  );
}
