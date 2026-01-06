import Link from "next/link";
import { BlogLayout } from "@/components/blog-layout";

// Mock blog posts data
const blogPosts = [
  {
    id: 1,
    title: "Getting Started with Minimalism",
    excerpt: "An introduction to minimalist design principles and how to apply them to your digital presence.",
    date: "2023-12-01",
    slug: "getting-started-with-minimalism"
  },
  {
    id: 2,
    title: "The Power of Black and White",
    excerpt: "Explore how a monochromatic color scheme can enhance focus and create timeless design that never goes out of style.",
    date: "2023-12-10",
    slug: "power-of-black-and-white"
  },
  {
    id: 3,
    title: "Typography in Minimal Design",
    excerpt: "Learn how to select and pair fonts that complement minimalist aesthetics while maintaining readability.",
    date: "2023-12-15",
    slug: "typography-in-minimal-design"
  },
  {
    id: 4,
    title: "White Space: The Silent Hero",
    excerpt: "Understand the importance of negative space in creating balanced, focused, and effective minimal layouts.",
    date: "2023-12-22",
    slug: "white-space-silent-hero"
  },
  {
    id: 5,
    title: "Minimalist Photography Tips",
    excerpt: "Simple techniques to capture striking minimalist photographs that tell powerful stories with less.",
    date: "2023-12-28",
    slug: "minimalist-photography-tips"
  },
];

export default function BlogPage() {
  return (
    <BlogLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Blog</h1>
          
          <div className="grid gap-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="p-6 border border-border rounded-md">
                <time className="text-sm text-muted-foreground">{post.date}</time>
                <h2 className="text-2xl font-bold mt-2 mb-3">
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <Link 
                  href={`/blog/${post.slug}`}
                  className="text-sm font-medium hover:underline"
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </BlogLayout>
  );
}