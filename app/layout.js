import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { PostHogProvider } from '@/components/posthog-provider';

export const metadata = {
  title: 'Spotted Jobs — Hyperlocal hiring, spotted by real people',
  description: 'Snap the "We\u2019re Hiring" posters you spot in shop windows. Discover real, hyperlocal jobs on a live map near you.',
};

export const viewport = {
  themeColor: '#32CACA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E📍%3C/text%3E%3C/svg%3E" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground">
        <Providers>
          <PostHogProvider>{children}</PostHogProvider>
        </Providers>
        <Toaster position="bottom-center" richColors offset={16} />
      </body>
    </html>
  );
}
