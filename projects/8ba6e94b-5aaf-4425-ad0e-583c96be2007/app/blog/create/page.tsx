"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { PostFormValues, createPostAction } from "@/app/actions/post"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, no spaces, only hyphens"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  excerpt: z.string().max(300, "Excerpt must be less than 300 characters").optional(),
  featuredImage: z.string().url("Must be a valid URL").optional().or(z.string().length(0)),
  published: z.boolean().default(false),
})

export default function CreatePostPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featuredImage: "",
      published: false,
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    
    try {
      // Create FormData for server action
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === "boolean") {
            if (value) formData.append(key, "on")
          } else {
            formData.append(key, value as string)
          }
        }
      })
      
      const result = await createPostAction(formData)
      
      if (result && !result.success) {
        const errorMessages = result.errors.map(e => e.message).join(", ")
        toast.error(errorMessages)
        return
      }
      
      toast.success("Post created successfully")
      router.push("/blog")
    } catch (error) {
      toast.error("Failed to create post")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Create New Post</h1>
          <Button
            variant="outline"
            onClick={() => router.push("/blog")}
          >
            Cancel
          </Button>
        </div>
        
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Post title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="post-url-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief summary of your post"
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="featuredImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your post content here..."
                        className="min-h-[300px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />
              
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Publish immediately
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  )
}
