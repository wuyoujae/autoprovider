import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, incrementPostView } from '@/lib/blog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Eye, Pencil } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  
  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }
  
  return {
    title: post.title,
    description: post.excerpt || post.content.substring(0, 160),
  }
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string }
}) {
  const post = await getPostBySlug(params.slug)
  
  if (!post) {
    notFound()
  }
  
  // Increment view count
  await incrementPostView(post.id)
  
  return (
    <main className="container py-10">
      <div className="flex flex-col gap-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back to Posts
            </Button>
          </Link>
          
          <Link href={`/blog/edit/${post.slug}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil size={16} />
              Edit
            </Button>
          </Link>
        </div>
        
        <article className="prose prose-gray dark:prose-invert max-w-none">
          {post.featuredImage && (
            <div className="mb-6 aspect-video overflow-hidden rounded-lg border">
              <img 
                src={post.featuredImage} 
                alt={post.title}
                className="w-full h-full object-cover" 
              />
            </div>
          )}
          
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <time dateTime={new Date(post.createdAt).toISOString()}>
                {new Date(post.createdAt).toLocaleDateString()}
              </time>
            </div>
            
            <span>·</span>
            
            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span>{post.viewCount + 1} views</span>
            </div>
            
            <span>·</span>
            
            <span>{post.authorName}</span>
          </div>
          
          {post.categories && post.categories.length > 0 && (
            <div className="flex gap-2 mb-6">
              {post.categories.map(category => (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <Badge variant="outline">{category.name}</Badge>
                </Link>
              ))}
            </div>
          )}
          
          <Separator className="my-6" />
          
          <div 
            className="prose prose-gray dark:prose-invert max-w-none" 
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />
        </article>
      </div>
    </main>
  )
}
