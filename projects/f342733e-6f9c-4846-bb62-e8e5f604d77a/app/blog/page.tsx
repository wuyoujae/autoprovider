import { BlogHeader } from "@/components/blog/header";
import { BlogPosts } from "@/components/blog/posts";

export const metadata = {
  title: "Blog",
  description: "Read our latest blog posts",
};

export default function BlogPage() {
  return (
    <div className="container mx-auto py-8">
      <BlogHeader />
      <BlogPosts />
    </div>
  );
}
