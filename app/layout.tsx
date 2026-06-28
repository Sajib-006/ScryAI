import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vetted — before you trust it, vet it",
  description:
    "Paste any company, product, person, listing or token. Vetted runs real-time, citation-backed due diligence and gives you a trust score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
