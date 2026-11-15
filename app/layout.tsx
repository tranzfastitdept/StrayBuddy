import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar';
import { AppChrome } from '@/components/layout/AppNav';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'StrayBuddy — Pet Radar Network',
  description:
    'Life360-style geospatial stray animal tracking, feeding loops and community charity campaigns.',
  applicationName: 'StrayBuddy',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
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
  themeColor: '#101827',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-hidden select-none">
      <body className="h-full w-full overflow-hidden bg-[color:var(--sb-bg)] font-sans text-[color:var(--sb-text)] antialiased">
        <AuthProvider>
          {/* One chrome for every screen: floating menu + overlay drawer */}
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
