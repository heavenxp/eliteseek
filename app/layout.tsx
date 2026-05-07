import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EliteSeek — Curated Elite Hosts",
  description:
    "A premium Elite Host and social experience marketplace. Book exclusive experiences, subscribe to exclusive content, and send luxury gifts.",
  keywords: ["Elite Host", "experiences", "luxury", "premium", "social"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EliteSeek",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "EliteSeek — Curated Elite Hosts",
    description:
      "Discover extraordinary social experiences with handpicked Elite Hosts.",
    type: "website",
    url: "https://eliteseek.com",
    siteName: "EliteSeek",
  },
  twitter: {
    card: "summary_large_image",
    title: "EliteSeek — Curated Elite Hosts",
    description:
      "Discover extraordinary social experiences with handpicked Elite Hosts.",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#080810",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} h-full`}
    >
      <head>
        {/* iOS home screen meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EliteSeek" />
        <meta name="format-detection" content="telephone=no" />
        {/* Apple splash screens — portrait iPhone sizes */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
