"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Rocket, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-xl text-white group-hover:bg-opacity-90 transition-all shadow-lg shadow-primary/30">
              <Rocket size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground hidden sm:block">
              CodeLift
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {!loading && user && (
              <Link
                href="/crypto-tool"
                className="hidden md:inline text-sm text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
              >
                Crypto tool
              </Link>
            )}
            {!loading && user && (
              <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400 max-w-[220px] truncate">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
              </span>
            )}
            {!loading && user && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
                >
                  Register
                </Link>
              </>
            )}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                aria-label="Toggle Dark Mode"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
