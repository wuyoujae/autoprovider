import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function NavBar() {
  return (
    <nav className="border-b bg-background py-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold">Blog</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:underline">Home</Link>
            <Link href="/blog" className="text-sm font-medium hover:underline">Articles</Link>
            <Link href="/categories" className="text-sm font-medium hover:underline">Categories</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/blog/create">
            <Button variant="outline" size="sm">Create Post</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
