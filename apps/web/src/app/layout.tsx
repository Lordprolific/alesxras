import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./content-pages.css";
import "./workspace-theme.css";
import "./launch-loading.css";

export const metadata: Metadata = {
  title: "Alesxras | Procurement, under control",
  description: "A privacy-first procurement workspace for human-led, agent-assisted sourcing on NEAR.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
