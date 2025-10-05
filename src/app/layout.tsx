import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { AppStoreProvider } from "@/store/app-store-provider";
import { ActiveJourneyMonitor } from "@/components/active-journey-monitor";
import { Toaster } from "@/components/ui/sonner";
import { fetchUserForStore } from "@/store/fetch-user";
import { JsonLd } from "@/components/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "OnTime - Inteligentna nawigacja miejska w czasie rzeczywistym",
    template: "%s | OnTime",
  },
  description:
    "OnTime to aplikacja PWA do śledzenia transportu publicznego w czasie rzeczywistym. Otrzymuj alerty o opóźnieniach, planuj trasy autobusem, tramwajem i pociągiem. Zawsze na czas!",
  generator: "Next.js",
  applicationName: "OnTime",
  manifest: "/manifest.json",
  keywords: [
    "transport publiczny",
    "śledzenie autobusów",
    "trasy komunikacji miejskiej",
    "alerty o opóźnieniach",
    "planowanie podróży",
    "nawigacja miejska",
    "rozkład jazdy",
    "autobus na żywo",
    "tramwaj online",
    "pociąg czas rzeczywisty",
    "PWA transport",
    "komunikacja miejska Polska",
  ],
  authors: [{ name: "Hydra Tech", url: "https://github.com/Octo-Hydra" }],
  creator: "Hydra Tech",
  publisher: "Hydra Tech",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "android-chrome",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "/",
    siteName: "OnTime",
    title: "OnTime - Inteligentna nawigacja miejska w czasie rzeczywistym",
    description:
      "Śledź transport publiczny na żywo, otrzymuj alerty o opóźnieniach i planuj optymalne trasy. OnTime - Koniec z czekaniem, zawsze na czas!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OnTime - Inteligentna nawigacja miejska",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OnTime - Inteligentna nawigacja miejska w czasie rzeczywistym",
    description:
      "Śledź transport publiczny na żywo, otrzymuj alerty o opóźnieniach i planuj optymalne trasy.",
    images: ["/og-image.png"],
    creator: "@ontime_app",
  },
  appleWebApp: {
    title: "OnTime",
    statusBarStyle: "black-translucent",
    capable: true,
    startupImage: [
      {
        url: "/splash-640x1136.svg",
        media:
          "screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash-750x1334.svg",
        media:
          "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash-1242x2208.svg",
        media:
          "screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash-1125x2436.svg",
        media:
          "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash-1242x2688.svg",
        media:
          "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  category: "travel",
  classification: "Public Transportation App",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user data on server-side for initial store state
  const user = await fetchUserForStore();

  return (
    <html lang="pl">
      <head>
        {/* iOS Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash-640x1136.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash-750x1334.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash-1242x2208.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash-1125x2436.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash-1242x2688.svg"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JsonLd />
        <AuthProvider>
          <AppStoreProvider user={user}>
            {children}
            <ActiveJourneyMonitor />
            <Toaster />
          </AppStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
