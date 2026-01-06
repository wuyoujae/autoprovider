<think>
用户要求我将代码片段中的修改合并到原始文件中。

代码片段主要是在 img 标签上面添加了 `eslint-disable-next-line` 注释来禁用 next.js 的 no-img-element 规则。

原始文件中对应的部分是：
```
                      {post.cover_image && (
                        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                          <img 
                            src={post.cover_image} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
```

我需要将 ` {/* eslint-disable-next-line @next/next/no-img-element */}` 添加到 img 标签的前面。

其他部分保持不变。
</think>

import Link from "next/link";
import { getPosts } from "@/lib/post";
import { getCategories } from "@/lib/category";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Eye, ArrowRight } from "lucide-react";
import { PostWithCategory } from "@/lib/post";

export default async function Home() {
  const posts = await getPosts({ status: "published", limit: 6 }) as PostWithCategory[];
  const categories = await getCategories();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
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
        <section className="mb-16 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            欢迎来到我的博客
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            分享技术、记录生活、传递价值
          </p>
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">最新文章</h2>
            <Link href="/posts">
              <Button variant="ghost" className="gap-2">
                查看更多 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link href={`/posts/${post.slug}`} key={post.id}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  {post.cover_image && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={post.cover_image} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {post.category && (
                        <Badge variant="secondary">{post.category_name}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <CardTitle className="text-xl line-clamp-2 hover:text-blue-600 transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {post.view_count} 阅读
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <h2 className="text-2xl font-bold mb-6">文章分类</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {categories.map((category: any) => (
                <Link href={`/categories/${category.slug}`} key={category.id}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-300">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">关于博客</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  这是一个使用 Next.js、TypeScript 和 MySQL 构建的现代化博客网站。
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>文章总数</span>
                    <span className="font-medium">{posts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>分类数量</span>
                    <span className="font-medium">{categories.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t mt-16 bg-white/50 dark:bg-slate-950/50">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2024 MyBlog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}