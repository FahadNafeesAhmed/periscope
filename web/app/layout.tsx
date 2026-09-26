import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Periscope — Below the surface",
  description: "Know what your competitors hide. Real prices, every country, past the login. Watched live, backed by evidence.",
  openGraph: { title: "Periscope — Below the surface", description: "Know what your competitors hide. Real prices, every country, past the login.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
