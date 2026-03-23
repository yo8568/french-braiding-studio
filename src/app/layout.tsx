import type { Metadata } from "next";
import "./globals.css";
import NavDrawer from "./components/NavDrawer";

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
        <header className="border-b border-border bg-card sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-primary">
              法式編織工作室
            </a>
            <NavDrawer />
          </div>
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
