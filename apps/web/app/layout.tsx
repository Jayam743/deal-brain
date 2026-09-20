import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { MobileTabBar, Sidebar } from "@/components/sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deal Brain",
  description:
    "A trustworthy buying-decision engine — honest verdicts, verified codes, no dark patterns.",
};

// Applied before paint to avoid a flash of the wrong theme; reads the same
// key the ThemeToggle writes to.
const themeInitScript = `(function(){try{var s=localStorage.getItem("deal-brain-theme");var t=s||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} ${plexMono.variable} antialiased`}
      >
        <div className="flex min-h-screen">
          <Sidebar configured={configured} userEmail={user?.email ?? null} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 pb-24 sm:px-10 md:pb-10">
            {children}
          </main>
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
