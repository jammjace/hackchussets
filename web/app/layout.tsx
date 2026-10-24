import type { Metadata } from "next";
import { Instrument_Serif, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { VideoFileProvider } from "@/components/upload/video-file-context";

// Na(h) type system (design/style-guide tokens/typography.css):
// Instrument Serif for display (400, normal + italic accent),
// Figtree for UI/body (400/500/600), JetBrains Mono (500) for timestamp pills.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  // 700 is used by the hero's "+mg" tag value (HERO_HANDOFF §2).
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Na(h) — Sodium Tracker",
  description:
    "Cook like you always do. We'll count the salt. Estimates from your pantry labels. Not medical advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${figtree.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <VideoFileProvider>{children}</VideoFileProvider>
        <Toaster />
      </body>
    </html>
  );
}
