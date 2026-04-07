"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/monthly-pl", label: "月次P/L", icon: "📄" },
  { href: "/service-pl", label: "サービス別P/L", icon: "📈" },
  { href: "/receivables", label: "入金予定", icon: "🧾" },
  { href: "/funding", label: "資金繰り表", icon: "💰" },
  { href: "/projects", label: "案件別採算", icon: "🏛️" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

const SIDEBAR_FULL = 220;
const SIDEBAR_MINI = 56;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 sidebar-container text-white flex items-center px-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 -ml-2 rounded-lg hover:bg-white/10"
          aria-label="メニュー"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <h1 className="text-base font-bold ml-3">UniPoll Finance</h1>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: `${SIDEBAR_FULL}px` }}
        className={`fixed top-0 left-0 h-screen sidebar-container text-white flex flex-col z-50 transition-all duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Desktop: override width with transition */}
        <style jsx>{`
          @media (min-width: 768px) {
            aside { width: ${sidebarW}px !important; }
          }
        `}</style>

        <div className="px-5 py-6 flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight">UniPoll Finance</h1>
              <p className="text-xs text-slate-400 mt-0.5">管理会計ダッシュボード</p>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${collapsed ? "rotate-180" : ""}`}>
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                } ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-xs text-slate-500">Data: freee API</p>
          </div>
        )}
      </aside>

      {/* Main content — no max-width, fill available space */}
      <main
        className="min-h-screen pt-14 md:pt-0 transition-all duration-200"
        style={{ marginLeft: 0 }}
      >
        <style jsx>{`
          @media (min-width: 768px) {
            main { margin-left: ${sidebarW}px !important; }
          }
        `}</style>
        <div className="px-3 md:px-5 pt-4 md:pt-5 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
