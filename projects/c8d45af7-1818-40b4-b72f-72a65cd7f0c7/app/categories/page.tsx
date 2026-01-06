<think>
用户提供了一个编辑说明："Fix linter errors in categories page"

用户提供了原始文件内容和要合并的代码片段。

要合并的代码片段：
1. 添加了 `import { Category } from "@/lib/db";`
2. 将 `const categories = await getCategories() as any[];` 改为 `const categories = await getCategories() as Category[];`

这是为了修复 linter 错误：
- 移除使用 `any[]` 类型，改用具体的 `Category` 类型

所以我只需要：
1. 在导入语句中添加 `import { Category } from "@/lib/db";`
2. 将 `as any[]` 改为 `as Category[]`

其他内容保持不变。
</think>

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCategories, createCategory, deleteCategory } from "@/lib/category";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Category } from "@/lib/db";

export default async function CategoriesPage() {
  const categories = await getCategories() as Category[];
  
  async function createCategoryAction(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string || name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const description = formData.get("description") as string;
    
    await createCategory({ name, slug, description });
    redirect("/categories");
  }
  
  async function deleteCategoryAction(formData: FormData) {
    "use server";
    
    const id = formData.get("id") as string;
    await deleteCategory(parseInt(id));
    redirect("/categories");
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
              <Link href="/categories" className="text-sm font-medium text-blue-600">
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
          <Link href="/">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" /> 返回首页
            </Button>
          </Link>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">分类管理</h1>
            <Badge variant="secondary">{categories.length} 个分类</Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">创建新分类</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createCategoryAction} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      名称 <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="分类名称" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="slug" className="text-sm font-medium">
                      URL 路径
                    </label>
                    <Input 
                      id="slug" 
                      name="slug" 
                      placeholder="category-slug"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      描述
                    </label>
                    <Input 
                      id="description" 
                      name="description" 
                      placeholder="分类描述（可选）"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2">
                    <Plus className="h-4 w-4" /> 创建分类
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">现有分类</h2>
              {categories.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">暂无分类</p>
                  </CardContent>
                </Card>
              ) : (
                categories.map((category: Category) => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                            /categories/{category.slug}
                          </code>
                        </div>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <Button 
                            type="submit" 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              if (!confirm("确定要删除这个分类吗？")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
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