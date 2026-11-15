import Link from 'next/link';
import { Compass, PawPrint } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="grid h-[100dvh] w-full place-items-center bg-[color:var(--sb-bg)] px-6">
      <div className="sb-glass w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--sb-surface-2)] text-[color:var(--sb-accent)]">
          <PawPrint className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h1 className="text-lg font-semibold text-[color:var(--sb-text)]">Page not found</h1>
        <p className="mt-1 text-sm text-[color:var(--sb-text-muted)]">
          That address does not exist in StrayBuddy.
        </p>
        <Link href="/" className="sb-primary mt-5 h-11 px-5 text-sm">
          <Compass className="h-4 w-4" strokeWidth={1.8} />
          Back to the map
        </Link>
      </div>
    </main>
  );
}
