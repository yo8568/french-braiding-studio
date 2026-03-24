"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import AuthGuard from "./AuthGuard";
import NavDrawer from "./NavDrawer";
import FeedbackWidget from "./FeedbackWidget";
import { useAuth } from "@/lib/auth";

function LogoutButton() {
  const { isAuthenticated, logout } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <button
      onClick={logout}
      className="text-sm text-muted hover:text-primary transition-colors"
    >
      登出
    </button>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-primary">
            法式編織工作室
          </a>
          <div className="flex items-center gap-3">
            <LogoutButton />
            <NavDrawer />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
      <footer className="border-t border-border bg-card py-4 text-center text-sm text-muted">
        法式編織工作室 &copy; {new Date().getFullYear()}
      </footer>
      <FeedbackWidget />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <LayoutContent>{children}</LayoutContent>
      </AuthGuard>
    </AuthProvider>
  );
}
