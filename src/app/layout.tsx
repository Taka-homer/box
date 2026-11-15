import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/components/data-provider";
import { AppShell } from "@/components/app-shell";
import { AccessGate } from "@/components/access-gate";

export const metadata: Metadata = {
  title: "わが家の収納",
  description: "もの・書類と収納場所を登録して、すぐに探せるようにするアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-dvh antialiased">
        <DataProvider>
          <AppShell>
            <AccessGate>{children}</AccessGate>
          </AppShell>
        </DataProvider>
      </body>
    </html>
  );
}
