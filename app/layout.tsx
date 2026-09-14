import type { Metadata } from "next";
import { Archivo, Geist_Mono, Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";
import "./workroom.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atrium",
  description: "Four personal apps, one login.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${archivo.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      {/* Vercel Web Analytics: a client component that renders null and injects
          the insights script. Mounted in the root layout so the login screen is
          measured too, and mounted nowhere else (one pageview per navigation). */}
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
