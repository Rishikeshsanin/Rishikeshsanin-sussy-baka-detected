import type { Metadata } from "next";
import "./globals.css";
import "./sbd.css";

function getMetadataBase(): URL {
  const explicitSiteUrl = process.env.SITE_URL?.trim();
  if (explicitSiteUrl) {
    return new URL(explicitSiteUrl);
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return new URL(`https://${productionHost}`);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return new URL(`https://${deploymentHost}`);
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Sussy Baka Detected — AI Guessing Game",
  description:
    "Think of someone. Don’t snitch. Answer a few questions and see if Sussy Baka Detected can clock the person or character hiding in your head.",
  applicationName: "Sussy Baka Detected",
  keywords: [
    "guessing game",
    "AI game",
    "Gemini game",
    "20 questions",
    "character guessing game",
    "Sussy Baka Detected",
  ],
  authors: [{ name: "Sussy Baka Detected" }],
  openGraph: {
    title: "Sussy Baka Detected",
    description: "Think of someone. Don’t snitch. Let the detector cook.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sussy Baka Detected",
    description: "Think of someone. Don’t snitch. Let the detector cook.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
