"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

          <div className="flex items-center gap-4">
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
