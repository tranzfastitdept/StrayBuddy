import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'StrayBuddy — Stray Animal Radar & Care Network',
  description: 'Life360-inspired geospatial stray animal tracking, feeding loops & charity campaigns',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StrayBuddy',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-hidden select-none">
      <body className="h-full w-full bg-slate-950 text-slate-100 flex flex-col font-sans antialiased overflow-hidden">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
