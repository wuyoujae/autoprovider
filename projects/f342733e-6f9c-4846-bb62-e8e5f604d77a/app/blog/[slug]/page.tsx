import { BlogPost } from "@/components/blog/post";
import { getBlogPosts } from "@/lib/blog";
import { notFound } from "next/navigation";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: BlogPostPageProps) {
  const posts = getBlogPosts();
  const post = posts.find((post) => post.slug === params.slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The post you're looking for doesn't exist",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const posts = getBlogPosts();
  const post = posts.find((post) => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <BlogPost post={post} />
    </div>
  );
}

export async function generateStaticParams() {
  const posts = getBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
