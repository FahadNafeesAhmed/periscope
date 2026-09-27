import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Periscope — Competitive briefs from real browsers",
  description:
    "What your competitors charge, including what they hide. Periscope's browser agents flip every pricing toggle, visit from other countries and sign in, then write a brief with a source for every number.",
  openGraph: {
    title: "Periscope — Competitive briefs from real browsers",
    description: "What your competitors charge, including what they hide.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
