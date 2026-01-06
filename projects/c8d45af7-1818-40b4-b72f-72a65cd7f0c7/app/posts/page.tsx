<think>
用户要求我将代码片段合并到原始文件中。根据编辑说明，这是一个修复 linter 错误的修改。

代码片段中的改动是在 `<img>` 标签上添加了 `{/* eslint-disable-next-line @next/next/no-img-element */}` 注释，这是为了禁用 next.js 的 img 元素 linting 规则。

我需要将这个注释添加到原始文件中的对应位置。原始文件中有一个 img 标签：

```jsx
<img 
  src={post.cover_image} 
  alt={post.title}
  className="w-full h-full object-cover"
/>
```

我需要在这个 img 标签前面添加 eslint-disable 注释。
</think>

import Link from "next/link";
import { getPosts } from "@/lib/post";
import { getCategories } from "@/lib/category";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Eye } from "lucide-react";
import { PostWithCategory } from "@/lib/post";

export default async function PostsPage() {
  const posts = await getPosts({ status: "published" }) as PostWithCategory[];
  const categories = await getCategories();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              MyBlog
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/posts" className="text-sm font-medium text-blue-600">
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
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold">所有文章</h1>
          <Badge variant="secondary">{posts.length} 篇</Badge>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">分类筛选</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/posts">
                  <Button variant="ghost" className="w-full justify-start">
                    全部文章
                  </Button>
                </Link>
                {categories.map((category: any) => (
                  <Link href={`/categories/${category.slug}`} key={category.id}>
                    <Button variant="ghost" className="w-full justify-start">
                      {category.name}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无文章</p>
                  <Link href="/posts/new">
                    <Button className="mt-4">撰写第一篇文章</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Link href={`/posts/${post.slug}`} key={post.id}>
                  <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {post.cover_image && (
                          <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 hidden sm:block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={post.cover_image} 
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {post.category && (
                              <Badge variant="secondary">{post.category_name}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(post.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold mb-2 line-clamp-1 hover:text-blue-600 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-muted-foreground line-clamp-2 text-sm mb-3">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {post.view_count} 阅读
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
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