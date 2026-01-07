"use client"

import Link from "next/link"
import { Calendar, Clock, Tag } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"

export interface Article {
  id: string
  title: string
  excerpt: string
  coverImage?: string
  category: string
  tags: string[]
  author: {
    name: string
    avatar?: string
  }
  publishedAt: string
  readTime: string
}

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {article.coverImage && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={article.coverImage}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {article.category}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {article.readTime}
          </div>
        </div>
        <Link href={`/blog/${article.id}`}>
          <h3 className="line-clamp-2 text-xl font-semibold transition-colors group-hover:text-primary">
            {article.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {article.excerpt}
        </p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1.5">
          {article.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs text-muted-foreground"
            >
              <Tag className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={article.author.avatar} />
            <AvatarFallback className="text-xs">
              {article.author.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {article.author.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(new Date(article.publishedAt), "MMM d, yyyy")}
        </div>
      </CardFooter>
    </Card>
  )
}
