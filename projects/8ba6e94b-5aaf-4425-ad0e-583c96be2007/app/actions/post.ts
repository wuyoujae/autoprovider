"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createPost, updatePost, getPostBySlug } from "@/lib/blog"

const postSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, no spaces, only hyphens"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  excerpt: z.string().max(300, "Excerpt must be less than 300 characters").optional().nullable(),
  featuredImage: z.string().url("Must be a valid URL").optional().nullable(),
  published: z.boolean().default(false),
  categoryIds: z.array(z.number()).default([]),
})

export type PostFormValues = z.infer<typeof postSchema>

export async function createPostAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries())
  
  // Handle checkbox fields
  const published = formData.get("published") === "on"
  
  // Handle array fields (for categories)
  const categoryIdsRaw = formData.getAll("categoryIds")
  const categoryIds = categoryIdsRaw.map(id => parseInt(id.toString()))
  
  const data = {
    ...rawData,
    published,
    categoryIds,
  }
  
  try {
    const parsed = postSchema.parse(data)
    const { id, ...createData } = parsed
    
    await createPost(createData)
    
    revalidatePath("/blog")
    redirect("/blog")
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: "Something went wrong" }] }
  }
}

export async function updatePostAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries())
  
  // Handle checkbox fields
  const published = formData.get("published") === "on"
  
  // Handle array fields (for categories)
  const categoryIdsRaw = formData.getAll("categoryIds")
  const categoryIds = categoryIdsRaw.map(id => parseInt(id.toString()))
  
  // Get post ID
  const id = parseInt(formData.get("id")?.toString() || "0")
  
  const data = {
    ...rawData,
    id,
    published,
    categoryIds,
  }
  
  try {
    const parsed = postSchema.parse(data)
    await updatePost(parsed)
    
    revalidatePath(`/blog/${parsed.slug}`)
    revalidatePath("/blog")
    redirect(`/blog/${parsed.slug}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, errors: [{ message: "Something went wrong" }] }
  }
}
