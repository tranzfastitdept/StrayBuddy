'use client';

import { useEffect } from 'react';
import { PawPrint, RotateCcw } from 'lucide-react';

// Shown when a page throws. Without an error component Next prints
// "missing required error components, refreshing..." instead.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[StrayBuddy] page error', error);
  }, [error]);

  return (
    <main className="grid h-[100dvh] w-full place-items-center bg-[color:var(--sb-bg)] px-6">
      <div className="sb-glass w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sb-danger)]/15 text-[color:var(--sb-danger)]">
          <PawPrint className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h1 className="text-lg font-semibold text-[color:var(--sb-text)]">Something went wrong</h1>
        <p className="mt-1 text-sm text-[color:var(--sb-text-muted)]">
          This screen could not load. You can try again — nothing was lost.
        </p>
        <button onClick={reset} className="sb-primary mt-5 h-11 px-5 text-sm">
          <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
          Try again
        </button>
      </div>
    </main>
  );
}
