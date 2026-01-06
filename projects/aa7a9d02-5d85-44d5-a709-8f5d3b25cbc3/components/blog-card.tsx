import Link from "next/link";
import Image from "next/image";
import { Eye, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BlogPost } from "@/app/types/blog";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/posts/${post.slug}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
        <div className="relative h-48 overflow-hidden">
          {post.cover_image ? (
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary/30">B</span>
            </div>
          )}
          {post.is_featured && (
            <span className="absolute top-3 left-3 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              精选
            </span>
          )}
        </div>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {post.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Eye className="h-3 w-3" />
              {post.views}
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{post.author}</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.created_at).toLocaleDateString("zh-CN")}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface FeaturedPostProps {
  post: BlogPost;
}

export function FeaturedPost({ post }: FeaturedPostProps) {
  return (
    <Link href={`/posts/${post.slug}`} className="block">
      <article className="relative h-[400px] rounded-xl overflow-hidden group">
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <span className="inline-block bg-primary text-white text-xs px-3 py-1 rounded-full mb-4">
            精选推荐
          </span>
          <h2 className="text-xl md:text-3xl font-bold text-white mb-3 line-clamp-2">
            {post.title}
          </h2>
          <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-4">
            {post.excerpt}
          </p>
          <div className="flex items-center gap-4 text-white/70 text-sm">
            <span>{post.author}</span>
            <span>•</span>
            <span>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
            <span>•</span>
            <span>{post.views} 阅读</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
