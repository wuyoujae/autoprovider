import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getAllPosts } from '@/lib/blog'

export default async function Home() {
  const posts = await getAllPosts({ page: 1, pageSize: 6 })
  
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="bg-muted py-20">
        <div className="container flex flex-col items-center text-center gap-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Welcome to Our Blog</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Discover the latest articles, tips, and insights from our team
          </p>
          <div className="flex gap-4">
            <Link href="/blog">
              <Button size="lg">Read Articles</Button>
            </Link>
            <Link href="/blog/create">
              <Button variant="outline" size="lg">Create Post</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-20">
        <div className="container">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Recent Articles</h2>
                <p className="text-muted-foreground">Explore our latest content</p>
              </div>
              <Link href="/blog">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.items.length > 0 ? (
                posts.items.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <Card className="h-full overflow-hidden hover:border-primary transition-colors">
                      {post.featuredImage && (
                        <div className="aspect-video overflow-hidden">
                          <img 
                            src={post.featuredImage} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform hover:scale-105" 
                          />
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                        <CardDescription>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3">
                          {post.excerpt || post.content.substring(0, 150) + '...'}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">Create your first blog post to get started</p>
                  <div className="mt-6">
                    <Link href="/blog/create">
                      <Button>Create First Post</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}