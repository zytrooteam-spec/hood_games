import './globals.css';
import ClientProviders from '@/components/providers/ClientProviders';

export const metadata = {
  title: 'Hood Games | Premier Online Sweepstakes Platform',
  description: 'Play America’s favorite sweeps platforms with instant Cash App & Zelle cashouts, 300% match bonus, and weekly Sunday cashback.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Rajdhani:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-[#070d1e] text-slate-100 antialiased min-h-screen selection:bg-[#2cb64e] selection:text-white">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
