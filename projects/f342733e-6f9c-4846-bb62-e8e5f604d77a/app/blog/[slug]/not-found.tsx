import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="container mx-auto py-32 text-center">
      <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
      <p className="text-muted-foreground mb-8">
        The blog post you're looking for doesn't exist or has been removed.
      </p>
      <Link 
        href="/blog"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Back to Blog
      </Link>
    </div>
  );
}
