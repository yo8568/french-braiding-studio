"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/works", label: "作品集" },
  { href: "/works/new", label: "新增作品" },
  { href: "/orders", label: "訂單管理" },
  { href: "/clients", label: "客戶管理" },
  { href: "/threads", label: "線材管理" },
  { href: "/techniques", label: "編法管理" },
  { href: "/hardware", label: "五金管理" },
  { href: "/calculator", label: "繩長計算機" },
  { href: "/feedback", label: "意見回饋" },
];

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? "bg-primary text-white"
                : "hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 hover:bg-primary/10 rounded-lg transition-colors"
        aria-label="開啟選單"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-card border-l border-border z-50 transform transition-transform duration-200 ease-in-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-primary">選單</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-primary/10 rounded transition-colors"
            aria-label="關閉選單"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? "bg-primary text-white"
                  : "hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
