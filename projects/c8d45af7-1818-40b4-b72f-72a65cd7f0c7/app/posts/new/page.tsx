<think>
用户要求修复 new post page 中的 linter 错误。

查看原始文件，我可以看到几个潜在的问题：

1. 在 `categories.map` 中，使用了 `(category: any)` 作为参数类型，但这是在 JSX 内部，不是实际的 TypeScript 类型声明位置。这可能导致 linter 错误。

2. 文件中使用了 `as any[]` 和 `as any` 类型断言，这不是最佳实践。

3. 导入部分没有导入 `Category` 类型。

根据用户提供的代码片段，他们添加了：
```typescript
import { Category } from "@/lib/db";
```
并更改了：
```typescript
const categories = await getCategories() as Category[];
```

这表明用户想要：
1. 添加 `Category` 类型的导入
2. 将 `as any[]` 改为 `as Category[]`

然后我还需要修复 `categories.map` 中的类型问题。原始代码是：
```tsx
{categories.map((category: any) => (
```

这应该改为使用正确的类型推断或显式类型。由于 `categories` 已经是 `Category[]` 类型，TypeScript 应该能够自动推断，所以我们可以写成：
```tsx
{categories.map((category) => (
```

或者如果需要显式类型：
```tsx
{categories.map((category: Category) => (
```

让我分析完整的修改：

1. 添加 `import { Category } from "@/lib/db";` 到导入部分


2. 更改 `const categories = await getCategories() as any[];` 为 `const categories = await getCategories() as Category[];`
3. 更改 `{categories.map((category: any) => (` 为 `{categories.map((category) => (` 或 `{categories.map((category: Category) => (`

我将继续检查文件中的其他潜在问题。`async function createPostAction(formData: FormData)` 在 Next.js 的 Server Actions 中是可以接受的。`redirect` 的使用也是正确的。

我将专注于修复类型和导入相关的 linting 问题，确保代码的类型安全性和清晰度。

在 map 函数中，我需要确保使用正确的类型。看起来我应该移除显式的类型注解，让 TypeScript 自动推断类型，或者使用 `Category` 类型。

具体修改包括：
1. 更新导入语句
2. 移除 `any` 类型注解
3. 确保 `categories.map` 中的参数类型正确

我将按照这个方案逐步调整代码结构。
</think>

import Link from "next/link";
import { redirect } from "next/navigation";
import { createPost } from "@/lib/post";
import { getCategories } from "@/lib/category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Category } from "@/lib/db";

export default async function NewPostPage() {
  const categories = await getCategories() as Category[];
  
  async function createPostAction(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string || title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const content = formData.get("content") as string;
    const excerpt = formData.get("excerpt") as string;
    const category_id = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    
    await createPost({
      title,
      slug,
      content,
      excerpt,
      category_id: category_id ? parseInt(category_id) : undefined,
      status,
    });
    
    redirect("/posts");
  }
  
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
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/posts">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" /> 返回文章列表
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">撰写新文章</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPostAction} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="输入文章标题" 
                    required 
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="slug" className="text-sm font-medium">
                    URL 路径
                  </label>
                  <Input 
                    id="slug" 
                    name="slug" 
                    placeholder="article-url-slug (留空将自动生成)"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="category_id" className="text-sm font-medium">
                      分类
                    </label>
                    <Select name="category_id">
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium">
                      发布状态
                    </label>
                    <Select name="status" defaultValue="published">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="published">已发布</SelectItem>
                        <SelectItem value="archived">已归档</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="excerpt" className="text-sm font-medium">
                    摘要
                  </label>
                  <Textarea 
                    id="excerpt" 
                    name="excerpt" 
                    placeholder="输入文章摘要（可选）"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium">
                    内容 <span className="text-red-500">*</span>
                  </label>
                  <Textarea 
                    id="content" 
                    name="content" 
                    placeholder="输入文章内容（支持 Markdown）"
                    rows={15}
                    required
                    className="font-mono"
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" size="lg">
                    发布文章
                  </Button>
                  <Link href="/posts">
                    <Button variant="outline" size="lg">
                      取消
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
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