<think>
用户要求我将代码片段合并到原始文件中。根据提供的代码片段，我需要：

1. 在 cover_image 的 img 标签上添加 `/* eslint-disable-next-line @next/next/no-img-element */` 注释

原始文件中的代码是：
```jsx
            {post.cover_image && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={post.cover_image} 
                  alt={post.title}
                  className="w-full h-auto"
                />
              </div>
            )}
```

需要替换为：
```jsx
            {post.cover_image && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={post.cover_image} 
                  alt={post.title}
                  className="w-full h-auto"
                />
              </div>
            )}
```

让我找到这个位置并替换。
</think>

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, incrementViewCount, getPosts } from "@/lib/post";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Eye, ArrowLeft, Tag } from "lucide-react";
import { PostWithCategory } from "@/lib/post";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug) as PostWithCategory | undefined;
  
  if (!post) {
    notFound();
  }
  
  await incrementViewCount(post.id);
  
  const relatedPosts = await getPosts({ 
    status: "published", 
    limit: 3,
    categoryId: post.category_id 
  }) as PostWithCategory[];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              MyBlog
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/posts" className="text-sm font-medium hover:text-blue-600 transition-colors">
                文章
              </Link>
              <Link href="/categories" className="text-sm font-medium hover:text-blue-600 transition-colors">
                分类
              </Link>
              <Link href="/posts/new">
                <Button size="sm">写文章</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/posts">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" /> 返回文章列表
            </Button>
          </Link>

          <article>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                {post.category && (
                  <Link href={`/categories/${post.category_slug}`}>
                    <Badge className="hover:bg-blue-600">{post.category_name}</Badge>
                  </Link>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(post.created_at).toLocaleDateString('zh-CN')}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.view_count + 1} 阅读
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>
              {post.excerpt && (
                <p className="text-xl text-muted-foreground leading-relaxed border-l-4 border-blue-500 pl-4">
                  {post.excerpt}
                </p>
              )}
            </div>

            {post.cover_image && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={post.cover_image} 
                  alt={post.title}
                  className="w-full h-auto"
                />
              </div>
            )}

            <Card className="mb-12">
              <CardContent className="p-8 prose prose-lg max-w-none dark:prose-invert">
                <div 
                  dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>').replace(/#{1,6}\s(.+)/g, '<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/- (.+)/g, '<li>$1</li>') }}
                />
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 mb-12 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Tag className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">标签:</span>
              <Badge variant="outline">通用</Badge>
            </div>
          </article>

          <div className="border-t pt-12">
            <h2 className="text-2xl font-bold mb-6">相关文章</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts
                .filter((p) => p.id !== post.id)
                .slice(0, 3)
                .map((relatedPost) => (
                  <Link href={`/posts/${relatedPost.slug}`} key={relatedPost.id}>
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 mb-2 hover:text-blue-600 transition-colors">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16 bg-white/50 dark:bg-slate-950/50">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2024 MyBlog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}