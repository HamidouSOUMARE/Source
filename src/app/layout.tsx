import type { Metadata } from "next";
import { Geist, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Clean sans — titles, UI chrome
const geist = Geist({
  variable: "--f-sans",
  subsets: ["latin"],
});

// Reading serif — answers
const newsreader = Newsreader({
  variable: "--f-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Monospace — metadata (filenames, pages, scores, labels)
const jetbrainsMono = JetBrains_Mono({
  variable: "--f-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sourcé — RAG documentaire",
  description:
    "Uploadez vos documents, posez des questions, obtenez des réponses sourcées. RAG avec Claude, Voyage AI et pgvector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geist.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
