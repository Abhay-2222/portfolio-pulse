import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { PageEnter } from "@/components/ui/PageEnter";

export const metadata: Metadata = {
  title: "Portfolio Pulse",
  description: "PMO portfolio health briefing",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PageEnter>{children}</PageEnter>
      </body>
    </html>
  );
}

