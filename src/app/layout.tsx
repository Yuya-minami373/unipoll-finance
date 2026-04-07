import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniPoll Finance",
  description: "UniPoll 管理会計ダッシュボード",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-surface min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
