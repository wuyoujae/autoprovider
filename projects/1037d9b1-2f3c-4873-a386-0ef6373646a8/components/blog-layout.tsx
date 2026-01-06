"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export const BlogLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Minimalist Blog</Link>
          
          <nav className="flex items-center space-x-4">
            <Link 
              href="/" 
              className={`text-sm ${pathname === "/" ? "font-bold" : "text-muted-foreground"}`}
            >
              Home
            </Link>
            <Link 
              href="/blog" 
              className={`text-sm ${pathname.startsWith("/blog") ? "font-bold" : "text-muted-foreground"}`}
            >
              Blog
            </Link>
            <Link 
              href="/about" 
              className={`text-sm ${pathname === "/about" ? "font-bold" : "text-muted-foreground"}`}
            >
              About
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="border-t border-border py-6 bg-secondary">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Minimalist Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};