import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "法式編織工作室",
  description: "記錄法式編織作品、線材、編法與繩長計算",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-card">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-6">
            <a href="/" className="text-xl font-bold text-primary">
              法式編織工作室
            </a>
            <a href="/works" className="hover:text-primary transition-colors">
              作品集
            </a>
            <a href="/works/new" className="hover:text-primary transition-colors">
              新增作品
            </a>
            <a href="/calculator" className="hover:text-primary transition-colors">
              繩長計算機
            </a>
          </nav>
        </header>
        <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
          {children}
        </main>
        <footer className="border-t border-border bg-card py-4 text-center text-sm text-muted">
          法式編織工作室 &copy; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
