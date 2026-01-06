"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/blog-navbar";
import { Footer } from "@/components/blog-navbar";
import { BlogCard } from "@/components/blog-card";
import { getPosts, getCategories } from "@/app/actions/blog";
import { BlogPost, BlogCategory } from "@/app/types/blog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

function PostsPageContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const totalPages = Math.ceil(totalPosts / 10);
  const selectedCategory = searchParams.get('category');

  const fetchPosts = async (page: number, category?: string) => {
    setLoading(true);
    try {
      const result = await getPosts(page, 10, category || undefined);
      setPosts(result.posts);
      setTotalPosts(result.total);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesData] = await Promise.all([getCategories()]);
      setCategories(categoriesData);
      await fetchPosts(1, selectedCategory || undefined);
    };
    fetchData();
  }, [selectedCategory]);

  useEffect(() => {
    fetchPosts(currentPage, selectedCategory || undefined);
  }, [currentPage, selectedCategory]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar categories={categories} />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {selectedCategory 
                ? categories.find(c => c.slug === selectedCategory)?.name || '文章列表'
                : '所有文章'
              }
            </h1>
            <p className="text-muted-foreground">
              共 {totalPosts} 篇文章
            </p>
          </div>

          {/* Category Filter */}
          <div className="mb-8 flex flex-wrap gap-4">
            {!selectedCategory && categories.map(category => (
              <a
                key={category.id}
                href={`/posts?category=${category.slug}`}
                className="inline-block"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div 
                      className="w-4 h-4 rounded-full mb-2" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
            {selectedCategory && (
              <a
                href="/posts"
                className="inline-block"
              >
                <Button variant="outline">
                  返回全部
                </Button>
              </a>
            )}
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">暂无文章</h2>
              <p className="text-muted-foreground">
                {selectedCategory ? '该分类下暂无文章' : '还没有发布任何文章'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {posts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Navbar categories={[]} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    }>
      <PostsPageContent />
    </Suspense>
  );
}
