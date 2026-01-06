import { BlogLayout } from "@/components/blog-layout";

export default function Home() {
  return (
    <BlogLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Welcome to Minimalist Blog</h1>
          <p className="text-xl mb-8 text-muted-foreground">
            A simple, elegant, and minimalist blog focused on content with a beautiful black and white theme.
          </p>
          
          <div className="grid gap-8">
            <div className="p-6 border border-border rounded-md">
              <h2 className="text-2xl font-bold mb-3">Clean Design</h2>
              <p className="text-muted-foreground">
                Our minimalist black and white design puts the focus on what matters most - your content.
                No distractions, just pure reading experience.
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-md">
              <h2 className="text-2xl font-bold mb-3">Responsive</h2>
              <p className="text-muted-foreground">
                Looks great on any device - from mobile phones to desktops.
                The reading experience is optimized for all screen sizes.
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-md">
              <h2 className="text-2xl font-bold mb-3">Dark & Light Mode</h2>
              <p className="text-muted-foreground">
                Switch between dark and light themes with a single click.
                Easy on the eyes, day or night.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BlogLayout>
  );
}