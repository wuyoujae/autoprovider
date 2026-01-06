"use server";

import db from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { BlogPost, BlogCategory, BlogComment, CreatePostInput, UpdatePostInput, CreateCommentInput, PostsResponse } from "@/app/types/blog";

interface PostRow extends RowDataPacket, BlogPost {}
interface CategoryRow extends RowDataPacket, BlogCategory {}
interface CommentRow extends RowDataPacket, BlogComment {}

export async function getPosts(page: number = 1, pageSize: number = 10, category?: string): Promise<PostsResponse> {
  try {
    const offset = (page - 1) * pageSize;
    let whereClause = "WHERE status = 'published'";
    const params: unknown[] = [];
    
    if (category) {
      whereClause += " AND category = ?";
      params.push(category);
    }
    
    const countSql = `SELECT COUNT(*) as total FROM blog_posts ${whereClause}`;
    const countResult = await db.query<RowDataPacket[]>(countSql, params);
    const total = Number(countResult[0]?.total || 0);
    
    const sql = `
      SELECT * FROM blog_posts 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const posts = await db.query<PostRow[]>(sql, [...params, pageSize, offset]);
    
    return {
      posts: posts.map(post => ({
        ...post,
        tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags
      })),
      total,
      page,
      pageSize
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { posts: [], total: 0, page, pageSize };
  }
}

export async function getFeaturedPosts(): Promise<BlogPost[]> {
  try {
    const posts = await db.query<PostRow[]>(
      "SELECT * FROM blog_posts WHERE status = 'published' AND is_featured = TRUE ORDER BY created_at DESC LIMIT 5"
    );
    return posts.map(post => ({
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags
    }));
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const posts = await db.query<PostRow[]>(
      "SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'",
      [slug]
    );
    
    if (posts.length === 0) return null;
    
    await db.execute("UPDATE blog_posts SET views = views + 1 WHERE id = ?", [posts[0].id]);
    
    return {
      ...posts[0],
      tags: typeof posts[0].tags === 'string' ? JSON.parse(posts[0].tags) : posts[0].tags
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export async function getPostById(id: number): Promise<BlogPost | null> {
  try {
    const posts = await db.query<PostRow[]>("SELECT * FROM blog_posts WHERE id = ?", [id]);
    
    if (posts.length === 0) return null;
    
    return {
      ...posts[0],
      tags: typeof posts[0].tags === 'string' ? JSON.parse(posts[0].tags) : posts[0].tags
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export async function createPost(data: CreatePostInput): Promise<{ success: boolean; postId?: number; error?: string }> {
  try {
    const result = await db.execute(
      `INSERT INTO blog_posts 
       (title, slug, excerpt, content, cover_image, author, status, is_featured, category, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.slug, data.excerpt, data.content, data.cover_image, data.author, data.status, data.is_featured, data.category, JSON.stringify(data.tags)]
    );
    
    return { success: true, postId: result.insertId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create post' };
  }
}

export async function updatePost(id: number, data: Partial<CreatePostInput>): Promise<{ success: boolean; error?: string }> {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'tags') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    values.push(id);
    
    await db.execute(
      `UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update post' };
  }
}

export async function deletePost(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.execute("DELETE FROM blog_posts WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete post' };
  }
}

export async function getCategories(): Promise<BlogCategory[]> {
  try {
    return await db.query<CategoryRow[]>("SELECT * FROM blog_categories ORDER BY name");
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function getCommentsByPostId(postId: number): Promise<BlogComment[]> {
  try {
    return await db.query<CommentRow[]>(
      "SELECT * FROM blog_comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at DESC",
      [postId]
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function createComment(data: CreateCommentInput): Promise<{ success: boolean; error?: string }> {
  try {
    await db.execute(
      "INSERT INTO blog_comments (post_id, author_name, author_email, content, status) VALUES (?, ?, ?, ?, 'pending')",
      [data.post_id, data.author_name, data.author_email, data.content]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create comment' };
  }
}

export async function generateSlug(title: string): Promise<string> {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
