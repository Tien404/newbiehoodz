import type { Metadata } from "next";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getSiteConfig } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteConfig().siteUrl,
  title: { default: "newbiehoodzzzz", template: "%s | newbiehoodzzzz" },
  description: "Free, made by students, for students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
