import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Veyra — The Character Oracle",
  description:
    "Think of any real or fictional character. Veyra will try to read the trail you leave behind.",
  applicationName: "Veyra",
  keywords: ["character guessing game", "AI game", "Gemini", "deduction game"],
  authors: [{ name: "Veyra" }],
  openGraph: {
    title: "Veyra — The Character Oracle",
    description: "Keep a character in mind. Answer honestly. See if Veyra can find them.",
    type: "website",
    images: [{ url: "/og.png", alt: "Veyra, the Character Oracle" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veyra — The Character Oracle",
    description: "Keep a character in mind. Answer honestly. See if Veyra can find them.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
