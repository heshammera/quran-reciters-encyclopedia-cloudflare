'use client';

import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import AudioPlayer from "@/components/player/AudioPlayer";
import { LeanModeProvider } from "@/context/LeanModeContext";
import LeanToggle from "@/components/layout/LeanToggle";
import AssistantChat from "@/components/assistant/AssistantChat";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import WelcomePopup from "@/components/layout/WelcomePopup";
import DonationBanner from "@/components/donation/DonationBanner";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import PresenceTracker from "@/components/layout/PresenceTracker";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* PWA Configuration */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="موسوعة القراء" />
        <link rel="apple-touch-icon" href="/logo.png" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Tajawal:wght@200;300;400;500;700;800;900&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const theme = localStorage.getItem('theme');
                const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                if (theme === 'dark' || (!theme && supportDarkMode)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();
          `,
        }} />
      </head>
      <body className="antialiased font-sans transition-colors duration-300 bg-background text-foreground">
        {!isAdmin && <DonationBanner />}
        <LeanModeProvider>
          <PlayerProvider>
            <div className="flex flex-col min-h-screen">
              {!isAdmin && <Navbar />}
              <main className="flex-grow">
                {children}
              </main>
              <AudioPlayer />
              <LeanToggle />
              <OfflineIndicator />
              <PresenceTracker />
              <WelcomePopup />
              {!isAdmin && <AssistantChat />}
              {!isAdmin && <Footer />}
            </div>
          </PlayerProvider>
        </LeanModeProvider>
      </body>
    </html >
  );
}
