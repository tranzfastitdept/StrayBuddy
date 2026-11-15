import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StrayBuddy — Map',
  description: 'Find and protect stray animals in your neighborhood',
};

// The map is the page: no SSR, no wrapper padding, full viewport.
const RadarMap = dynamic(() => import('../components/map/RadarMap'), { ssr: false });

export default function Home() {
  return (
    <main className="relative h-[100dvh] w-[100vw] overflow-hidden">
      <RadarMap />
    </main>
  );
}
