import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "SyncDocs — Local-First Collaborative Editor",
  description:
    "Write offline, collaborate in real-time. SyncDocs keeps your documents safe with CRDT-based sync and full version history.",
  keywords: ["document editor", "offline", "collaborative", "real-time"],
  authors: [{ name: "SyncDocs" }],
  openGraph: {
    title: "SyncDocs",
    description: "Local-First Collaborative Document Editor",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
