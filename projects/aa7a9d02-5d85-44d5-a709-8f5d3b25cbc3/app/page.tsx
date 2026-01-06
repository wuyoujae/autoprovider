import Link from "next/link";
import { ArrowRight, BookOpen, Code, Lightbulb, PenTool } from "lucide-react";
import { Navbar } from "@/components/blog-navbar";
import { Footer } from "@/components/blog-navbar";
import { BlogCard, FeaturedPost } from "@/components/blog-card";
import { getFeaturedPosts, getPosts, getCategories } from "@/app/actions/blog";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featuredPosts, postsResult, categories] = await Promise.all([
    getFeaturedPosts(),
    getPosts(1, 6),
    getCategories()
  ]);

  const recentPosts = postsResult.posts;
  const featuredPost = featuredPosts[0];
  const otherFeatured = featuredPosts.slice(1, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar categories={categories} />
      
      <main className="flex-1">
        {/* Hero Section */}
        {featuredPost && (
          <section className="relative bg-gradient-to-br from-primary/5 via-background to-background">
            <div className="container mx-auto px-4 py-12 md:py-20">
              {featuredPost && <FeaturedPost post={featuredPost} />}
            </div>
          </section>
        )}

        {/* Other Featured Posts */}
        {otherFeatured.length > 0 && (
          <section className="container mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold mb-6">更多精选</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherFeatured.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Posts */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">最新文章</h2>
            <Link href="/posts">
              <Button variant="ghost" className="gap-2">
                查看全部 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">分类浏览</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/posts?category=tech-tutorials">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Code className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">技术教程</h3>
                      <p className="text-sm text-muted-foreground">编程技巧</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/posts?category=product-design">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <Lightbulb className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">产品设计</h3>
                      <p className="text-sm text-muted-foreground">UX/UI设计</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/posts?category=life-notes">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                      <BookOpen className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">生活随笔</h3>
                      <p className="text-sm text-muted-foreground">生活感悟</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/posts?category=book-notes">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <PenTool className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">读书笔记</h3>
                      <p className="text-sm text-muted-foreground">书评分享</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { Button } from "@/components/ui/button";
