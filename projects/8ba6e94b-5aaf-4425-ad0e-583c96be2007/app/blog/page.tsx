import { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { formatDate } from '@/lib/db-utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Latest articles and posts from our blog',
}

export default async function BlogPage({ 
  searchParams 
}: { 
  searchParams: { page?: string } 
}) {
  const page = Number(searchParams.page) || 1
  const pageSize = 10
  
  const posts = await getAllPosts({ page, pageSize })
  
  return (
    <main className="container py-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="text-muted-foreground">Latest articles and posts</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {posts.items.map(post => (
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
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>{post.authorName}</span>
                    <span className="text-xs">•</span>
                    <time dateTime={new Date(post.createdAt).toISOString()}>
                      {formatDate(new Date(post.createdAt))}
                    </time>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {post.excerpt || post.content.substring(0, 150) + '...'}
                  </p>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  {post.viewCount} views
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
        
        {posts.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: posts.totalPages }, (_, i) => i + 1).map(pageNum => (
              <Link 
                key={pageNum} 
                href={`/blog?page=${pageNum}`}
                className={`px-4 py-2 rounded-md ${pageNum === page 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'}`}
              >
                {pageNum}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
