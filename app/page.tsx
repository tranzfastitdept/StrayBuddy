import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StrayBuddy Radar',
  description: 'Find and protect stray animals in your neighborhood',
};

// Dynamically import the map component with no SSR to avoid window errors
const RadarMap = dynamic(() => import('../components/map/RadarMap'), { ssr: false });

export default function Home() {
  return (
    <main className="relative h-screen w-full">
      <RadarMap />
    </main>
  );
}
