"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, PenSquare, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories } from "@/app/actions/blog";
import { BlogCategory } from "@/app/types/blog";

export function Navbar({ categories }: { categories: BlogCategory[] }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-bold text-xl">BlogHub</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                首页
              </Link>
              <Link
                href="/posts"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname.startsWith("/posts") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                文章
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.includes(category.slug) ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-2 ${searchOpen ? "flex" : ""}`}>
              <Input
                type="search"
                placeholder="搜索文章..."
                className="w-64"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>
            <Link href="/editor">
              <Button size="sm" className="hidden md:flex">
                <PenSquare className="h-4 w-4 mr-2" />
                写文章
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                首页
              </Link>
              <Link
                href="/posts"
                className="text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                文章
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className="text-sm font-medium text-muted-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
              <Link href="/editor" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">
                  <PenSquare className="h-4 w-4 mr-2" />
                  写文章
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-bold text-xl">BlogHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              分享知识，记录生活\n一个充满温度的技术博客
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">文章分类</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/posts?category=tech-tutorials" className="hover:text-primary">技术教程</Link></li>
              <li><Link href="/posts?category=product-design" className="hover:text-primary">产品设计</Link></li>
              <li><Link href="/posts?category=life-notes" className="hover:text-primary">生活随笔</Link></li>
              <li><Link href="/posts?category=book-notes" className="hover:text-primary">读书笔记</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary">首页</Link></li>
              <li><Link href="/posts" className="hover:text-primary">文章列表</Link></li>
              <li><Link href="/editor" className="hover:text-primary">写文章</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">关于我们</h3>
            <p className="text-sm text-muted-foreground">
              BlogHub 是一个专注于技术分享和个人成长的博客平台。\n\n联系我们: hello@bloghub.com
            </p>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 BlogHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
