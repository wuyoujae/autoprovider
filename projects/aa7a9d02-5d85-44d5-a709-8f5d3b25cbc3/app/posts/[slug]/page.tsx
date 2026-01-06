import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Eye, Tag, User } from "lucide-react";
import { Navbar } from "@/components/blog-navbar";
import { Footer } from "@/components/blog-navbar";
import { getPostBySlug, getCategories, getCommentsByPostId } from "@/app/actions/blog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

interface PostPageProps {
  params: {
    slug: string;
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const [post, categories, comments] = await Promise.all([
    getPostBySlug(params.slug),
    getCategories(),
    post ? getCommentsByPostId(post.id) : Promise.resolve([])
  ]);

  if (!post) {
    notFound();
  }

  const publishedDate = new Date(post.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar categories={categories} />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back Button */}
          <Link href="/posts">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回文章列表
            </Button>
          </Link>

          <article className="prose prose-lg max-w-none">
            {/* Header */}
            <header className="mb-8">
              <div className="center">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">{post.category}</Badge>
                  {post.is_featured && (
                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                      精选
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                  {post.title}
                </h1>
                <p className="text-xl text-muted-foreground mb-6">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{publishedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span>{post.views} 次阅读</span>
                  </div>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Cover Image */}
            {post.cover_image && (
              <div className="mb-8">
                <div className="relative h-[400px] md:h-[500px] overflow-hidden rounded-lg">
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div 
              className="prose-content mb-12"
              dangerouslySetInnerHTML={{ 
                __html: post.content.replace(/\n/g, '<br />') 
              }}
            />
          </article>

          {/* Comments Section */}
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">评论 ({comments.length})</h2>
            
            {/* Comment Form */}
            <Card className="mb-8">
              <CardHeader>
                <h3 className="text-lg font-semibold">发表评论</h3>
              </CardHeader>
              <CardContent>
                <form className="space-y-4"
                  action={async (formData: FormData) => {
                    'use server';
                    const { createComment } = await import('@/app/actions/blog');
                    
                    const createCommentInput = {
                      post_id: post.id,
                      author_name: formData.get('author_name') as string,
                      author_email: formData.get('author_email') as string,
                      content: formData.get('content') as string
                    };
                    
                    await createComment(createCommentInput);
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      name="author_name"
                      type="text"
                      placeholder="您的姓名"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                    <input
                      name="author_email"
                      type="email"
                      placeholder="您的邮箱（可选）"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <textarea
                    name="content"
                    placeholder="写下您的评论..."
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                  <Button type="submit">发表评论</Button>
                </form>
              </CardContent>
            </Card>

            {/* Comments List */}
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {comment.author_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold">{comment.author_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">{comment.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无评论，来做第一个评论的人吧！</p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
