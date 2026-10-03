import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SessionCloseHandler } from "@/app/components/SessionCloseHandler";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "How To Work With Me",
  description: "A personal communication and collaboration guide — clear, practical, from your answers only.",
  robots: "index, follow",
};

const AUTH_CALLBACK = "/auth/callback";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignInUrl={AUTH_CALLBACK}
      afterSignUpUrl={AUTH_CALLBACK}
    >
      <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`} data-theme="light">
        <head>
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `(() => { try { const storageKey = 'htwwm_theme'; const mql = window.matchMedia('(prefers-color-scheme: dark)'); const stored = window.localStorage.getItem(storageKey); const mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'; const prefersDark = mql.matches; const theme = mode === 'light' ? 'light' : mode === 'dark' ? 'dark' : (prefersDark ? 'dark' : 'light'); document.documentElement.dataset.theme = theme; } catch (e) {} })();`,
            }}
          />
        </head>
        <body className="min-h-screen bg-surface text-ink font-sans antialiased">
          <SessionCloseHandler />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
