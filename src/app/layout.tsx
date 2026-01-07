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
import SplashScreen from "@/components/ui/SplashScreen";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
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
        <Suspense fallback={null}>
          {!isAdmin && <SplashScreen />}
        </Suspense>
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
